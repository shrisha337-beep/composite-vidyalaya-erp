"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

interface PromotionDecision {
  studentId: string;
  action: "PROMOTE" | "RETAIN";
  marks?: string;
}

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

  // 1. Fetch target session details to verify it exists
  const targetSession = await prisma.academicSession.findUnique({
    where: { id: targetSessionId },
    select: { label: true },
  });

  if (!targetSession) {
    return { success: false, count: 0, message: "Selected target academic session not found." };
  }

  // 2. Perform bulk promotion in a single transaction
  let updatedCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const dec of studentDecisions) {
        // Find current student details to determine their current class name
        const student = await tx.student.findUnique({
          where: { id: dec.studentId },
          include: { section: { include: { class: true } } },
        });

        if (!student) continue;

        const currentClassName = student.section?.class?.name || "1";

        // Determine class name to assign
        let classNameToAssign = currentClassName;
        if (dec.action === "PROMOTE") {
          classNameToAssign = targetClassVal;
        }

        // Find target section "A" in target session
        const targetSection = await tx.section.findFirst({
          where: {
            name: "A",
            class: {
              name: classNameToAssign,
              sessionId: targetSessionId,
            },
          },
          select: { id: true, classId: true },
        });

        if (!targetSection) {
          throw new Error(
            `Class ${classNameToAssign} Section A not found in session ${targetSession.label}. Please configure it first.`
          );
        }

        // Create AdmissionApplication record for tracking promotion history
        await tx.admissionApplication.create({
          data: {
            type: "PROMOTION",
            status: "APPROVED",
            existingStudentId: student.id,
            targetClassId: targetSection.classId,
            targetSectionId: targetSection.id,
            formData: {
              action: dec.action,
              previousClass: currentClassName,
              assignedClass: classNameToAssign,
              marksObtained: dec.marks || "—",
              dateOfPromotion: new Date().toISOString(),
            },
            submittedById: adminUserId,
            reviewedById: adminUserId,
            reviewedAt: new Date(),
          },
        });

        // Update student section pointer to the new section
        await tx.student.update({
          where: { id: student.id },
          data: {
            sectionId: targetSection.id,
          },
        });

        updatedCount++;
      }
    });

    revalidatePath(`/${locale}/admin/students`);
    return {
      success: true,
      count: updatedCount,
      message: `Successfully processed promotions for ${updatedCount} students.`,
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      message: err instanceof Error ? err.message : "An error occurred during promotion.",
    };
  }
}
