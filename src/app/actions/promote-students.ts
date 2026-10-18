"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

interface PromotionDecision {
  studentId: string;
  action: "PROMOTE" | "RETAIN";
  marks?: string;
}

/**
 * Promote/retain students from a source class to a target session+class.
 *
 * Rewrite rationale (G1–G4):
 * - Old version ran ~5 queries per student inside a loop (lookup → section
 *   search → history insert → update). For 40 students ≈ 200 sequential
 *   queries in one interactive transaction.
 * - New version loads the target section once, validates in-memory, then
 *   writes history and updates in batched statements.
 * - Class 8 promoted students are "passed out" (isActive=false, sectionId=null).
 * - Idempotent: skips students who already have an EnrollmentHistory record
 *   for the target session.
 * - Explicit transaction timeout as safety net on Neon.
 */
export async function promoteStudentsAction({
  studentDecisions,
  targetSessionId,
  targetClassVal,
  locale,
}: {
  studentDecisions: PromotionDecision[];
  targetSessionId: string;
  targetClassVal: string;
  locale: string;
}): Promise<{ success: boolean; count: number; message: string }> {
  const session = await requireRole(["ADMIN"]);
  const adminUserId = session.user.id;

  if (studentDecisions.length === 0) {
    return { success: false, count: 0, message: "No students selected for promotion." };
  }

  // 1. Validate target session exists
  const targetSession = await prisma.academicSession.findUnique({
    where: { id: targetSessionId },
    select: { label: true },
  });

  if (!targetSession) {
    return { success: false, count: 0, message: "Selected target academic session not found." };
  }

  // 2. Load ALL students involved in one query (replaces per-student lookup)
  const studentIds = studentDecisions.map((d) => d.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      fullName: true,
      section: {
        select: {
          name: true,
          class: { select: { name: true } },
        },
      },
    },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // 3. Check idempotency — skip students who already have enrollment
  //    history for the target session
  const existingHistory = await prisma.enrollmentHistory.findMany({
    where: {
      studentId: { in: studentIds },
      sessionId: targetSessionId,
    },
    select: { studentId: true },
  });
  const alreadyProcessed = new Set(existingHistory.map((h) => h.studentId));

  // 4. Build the list of effective decisions (skip already-processed)
  const decisionsMap = new Map(studentDecisions.map((d) => [d.studentId, d]));
  const effectiveDecisions: Array<{
    studentId: string;
    action: "PROMOTE" | "RETAIN";
    marks: string;
    currentClassName: string;
    targetClassName: string;
  }> = [];

  for (const dec of studentDecisions) {
    if (alreadyProcessed.has(dec.studentId)) continue;

    const student = studentMap.get(dec.studentId);
    if (!student) continue;

    const currentClassName = student.section?.class?.name || "1";
    const targetClassName = dec.action === "PROMOTE" ? targetClassVal : currentClassName;

    effectiveDecisions.push({
      studentId: dec.studentId,
      action: dec.action,
      marks: dec.marks || "—",
      currentClassName,
      targetClassName,
    });
  }

  if (effectiveDecisions.length === 0) {
    return {
      success: true,
      count: 0,
      message: alreadyProcessed.size > 0
        ? `All ${alreadyProcessed.size} student(s) were already processed for this session.`
        : "No eligible students to process.",
    };
  }

  // 5. Determine which students need a target section and which are passing out
  const isPassOut = (dec: typeof effectiveDecisions[number]) =>
    dec.action === "PROMOTE" && dec.currentClassName === "8";

  const needsSection = effectiveDecisions.filter((d) => !isPassOut(d));
  const passingOut = effectiveDecisions.filter((d) => isPassOut(d));

  // 6. Load ALL target sections needed in one query.
  //    Since each class has only one section ("A"), we just need distinct class names.
  const classNamesNeeded = [...new Set(needsSection.map((d) => d.targetClassName))];
  const targetSections = classNamesNeeded.length > 0
    ? await prisma.section.findMany({
        where: {
          name: "A",
          class: {
            name: { in: classNamesNeeded },
            sessionId: targetSessionId,
          },
        },
        select: {
          id: true,
          name: true,
          classId: true,
          class: { select: { name: true } },
        },
      })
    : [];

  const sectionByClassName = new Map(
    targetSections.map((s) => [s.class.name, s])
  );

  // Verify all needed sections exist
  for (const className of classNamesNeeded) {
    if (!sectionByClassName.has(className)) {
      return {
        success: false,
        count: 0,
        message: `Class ${className} Section A not found in session ${targetSession.label}. Please configure it first.`,
      };
    }
  }

  // 7. Execute batched writes in a single transaction
  try {
    await prisma.$transaction(
      async (tx) => {
        // 7a. Create enrollment history records in bulk
        const historyData = effectiveDecisions.map((dec) => {
          const isPO = isPassOut(dec);
          const section = isPO ? null : sectionByClassName.get(dec.targetClassName)!;
          return {
            studentId: dec.studentId,
            sessionId: targetSessionId,
            sectionId: section?.id ?? null,
            className: isPO ? "PASSED_OUT" : dec.targetClassName,
            sectionName: isPO ? "—" : "A",
            action: isPO ? "PASS_OUT" : dec.action,
            previousClass: dec.currentClassName,
            remarks: isPO
              ? `Passed out from Class 8 (${dec.marks})`
              : `${dec.action === "PROMOTE" ? "Promoted" : "Retained"} (${dec.marks})`,
            performedById: adminUserId,
          };
        });

        await tx.enrollmentHistory.createMany({ data: historyData });

        // 7b. Create AdmissionApplication records for backward compatibility
        const appData = effectiveDecisions.map((dec) => {
          const isPO = isPassOut(dec);
          const section = isPO ? null : sectionByClassName.get(dec.targetClassName)!;
          return {
            type: "PROMOTION" as const,
            status: "APPROVED" as const,
            existingStudentId: dec.studentId,
            targetClassId: section?.classId ?? null,
            targetSectionId: section?.id ?? null,
            formData: {
              action: isPO ? "PASS_OUT" : dec.action,
              previousClass: dec.currentClassName,
              assignedClass: isPO ? "PASSED_OUT" : dec.targetClassName,
              marksObtained: dec.marks,
              dateOfPromotion: new Date().toISOString(),
            },
            submittedById: adminUserId,
            reviewedById: adminUserId,
            reviewedAt: new Date(),
          };
        });

        // createMany doesn't support Json fields in all adapters, so use individual creates
        // but we can parallelize them since they're independent
        await Promise.all(
          appData.map((data) => tx.admissionApplication.create({ data }))
        );

        // 7c. Update students who move to a new section (batched per target class)
        for (const [className, section] of sectionByClassName) {
          const movingIds = needsSection
            .filter((d) => d.targetClassName === className)
            .map((d) => d.studentId);

          if (movingIds.length > 0) {
            await tx.student.updateMany({
              where: { id: { in: movingIds } },
              data: { sectionId: section.id },
            });
          }
        }

        // 7d. Pass out class 8 students
        if (passingOut.length > 0) {
          const passOutIds = passingOut.map((d) => d.studentId);
          await tx.student.updateMany({
            where: { id: { in: passOutIds } },
            data: {
              isActive: false,
              sectionId: null,
            },
          });
        }
      },
      { timeout: 15000 } // 15s timeout — generous for Neon over HTTP
    );

    const updatedCount = effectiveDecisions.length;
    const passedOutCount = passingOut.length;
    const skippedCount = alreadyProcessed.size;

    let msg = `Successfully processed ${updatedCount} student(s).`;
    if (passedOutCount > 0) {
      msg += ` ${passedOutCount} Class 8 student(s) passed out.`;
    }
    if (skippedCount > 0) {
      msg += ` ${skippedCount} already processed (skipped).`;
    }

    revalidatePath(`/${locale}/admin/students`);
    return { success: true, count: updatedCount, message: msg };
  } catch (err) {
    return {
      success: false,
      count: 0,
      message: err instanceof Error ? err.message : "An error occurred during promotion.",
    };
  }
}
