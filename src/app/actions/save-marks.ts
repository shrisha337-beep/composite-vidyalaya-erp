"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

type ExamTerm = "UNIT_TEST_1" | "UNIT_TEST_2" | "HALF_YEARLY" | "ANNUAL";

interface StudentMarkRecord {
  studentId: string;
  marksObtained: number;
}

const TERM_MAX_MARKS: Record<ExamTerm, number> = {
  UNIT_TEST_1: 10,
  UNIT_TEST_2: 10,
  HALF_YEARLY: 30,
  ANNUAL: 50,
};

export async function saveStudentMarksAction({
  marksRecords,
  subjectId,
  examTerm,
  locale,
}: {
  marksRecords: StudentMarkRecord[];
  subjectId: string;
  examTerm: ExamTerm;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["TEACHER"]);
  const teacherUserId = session.user.id;

  if (!subjectId || !examTerm || marksRecords.length === 0) {
    return { success: false, message: "Missing required parameters." };
  }

  const maxMarks = TERM_MAX_MARKS[examTerm];

  // 1. Fetch active session and verify subject
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, class: { select: { sessionId: true, name: true } } },
  });

  if (!subject) {
    return { success: false, message: "Subject not found." };
  }

  // 2. Verify teacher is assigned to this subject via TeacherSubject
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
    select: { id: true },
  });

  if (!teacher) {
    return { success: false, message: "Teacher record not found." };
  }

  const teacherSubjectLink = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId: teacher.id,
        subjectId,
      },
    },
  });

  if (!teacherSubjectLink) {
    return {
      success: false,
      message: `You are not assigned to this subject in Class ${subject.class.name}. Contact the administrator.`,
    };
  }

  const activeSessionId = subject.class.sessionId;

  // 2. Validate marks range
  for (const rec of marksRecords) {
    if (rec.marksObtained < 0 || rec.marksObtained > maxMarks) {
      return {
        success: false,
        message: `Invalid marks detected. Marks must be between 0 and the maximum limit of ${maxMarks} for ${examTerm.replace(/_/g, " ")}.`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete existing marks for these students + subject + session + term,
      // then bulk insert. Two queries instead of N upserts.
      const studentIds = marksRecords.map((r) => r.studentId);
      await tx.mark.deleteMany({
        where: {
          studentId: { in: studentIds },
          subjectId,
          sessionId: activeSessionId,
          examTerm,
        },
      });
      await tx.mark.createMany({
        data: marksRecords.map((rec) => ({
          studentId: rec.studentId,
          subjectId,
          sessionId: activeSessionId,
          examTerm,
          marksObtained: rec.marksObtained,
          maxMarks,
          enteredById: teacherUserId,
        })),
      });
    });

    revalidatePath(`/${locale}/teacher/marks-entry`);
    return {
      success: true,
      message: `Marks successfully saved for ${marksRecords.length} students.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "An error occurred while saving marks.",
    };
  }
}
