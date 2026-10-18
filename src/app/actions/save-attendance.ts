"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

interface AttendanceRecord {
  studentId: string;
  status: "PRESENT" | "ABSENT";
}

export async function saveDailyAttendanceAction({
  attendanceRecords,
  dateString,
  sectionId,
  locale,
}: {
  attendanceRecords: AttendanceRecord[];
  dateString: string;
  sectionId: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["TEACHER", "ADMIN"]);
  const userId = session.user.id;
  const userRole = session.user.role;

  if (!sectionId || !dateString || attendanceRecords.length === 0) {
    return { success: false, message: "Missing required parameters." };
  }

  const attendanceDate = new Date(dateString);
  if (isNaN(attendanceDate.getTime())) {
    return { success: false, message: "Invalid date selected." };
  }

  // Verify section and session
  const section = await prisma.section.findFirst({
    where: { id: sectionId },
    select: {
      id: true,
      classTeacher: { select: { userId: true } },
      class: { select: { sessionId: true } },
    },
  });

  if (!section) {
    return { success: false, message: "Section not found." };
  }

  // If user is a TEACHER, verify they are the class teacher of this section
  if (userRole === "TEACHER" && section.classTeacher?.userId !== userId) {
    return {
      success: false,
      message: "Permission denied. You are not assigned as the class teacher for this class.",
    };
  }

  const activeSessionId = section.class.sessionId;

  try {
    // G6: Verify all submitted students belong to this section
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: attendanceRecords.map((r) => r.studentId) },
        sectionId,
        isActive: true,
      },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));
    const invalidIds = attendanceRecords.filter((r) => !validIds.has(r.studentId));
    if (invalidIds.length > 0) {
      return {
        success: false,
        message: `${invalidIds.length} student(s) do not belong to this section.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing records for this date + these students, then bulk insert.
      // Two queries instead of N upserts.
      const studentIds = attendanceRecords.map((r) => r.studentId);
      await tx.attendance.deleteMany({
        where: {
          studentId: { in: studentIds },
          date: attendanceDate,
        },
      });
      await tx.attendance.createMany({
        data: attendanceRecords.map((rec) => ({
          studentId: rec.studentId,
          sessionId: activeSessionId,
          date: attendanceDate,
          status: rec.status,
          markedById: userId,
        })),
      });
    });

    revalidatePath(`/${locale}/teacher/attendance`);
    revalidatePath(`/${locale}/admin/attendance`);
    return {
      success: true,
      message: `Daily attendance for ${attendanceRecords.length} students successfully saved.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "An error occurred while saving attendance.",
    };
  }
}
