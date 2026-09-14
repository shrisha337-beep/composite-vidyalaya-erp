"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function applyStudentLeaveAction({
  studentId,
  fromDateString,
  toDateString,
  reason,
  locale,
}: {
  studentId: string;
  fromDateString: string;
  toDateString: string;
  reason: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  // Class teacher or admin applies leave on behalf of a student
  const session = await requireRole(["TEACHER", "ADMIN"]);

  const fromDate = new Date(fromDateString);
  const toDate = new Date(toDateString);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { success: false, message: "Invalid date format." };
  }

  if (fromDate > toDate) {
    return { success: false, message: "From Date must be before or on To Date." };
  }

  if (!reason.trim()) {
    return { success: false, message: "Reason is required." };
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    return { success: false, message: "Student record not found." };
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        applicantType: "STUDENT",
        studentId: student.id,
        fromDate,
        toDate,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    revalidatePath(`/${locale}/teacher/leave-approval`);
    revalidatePath(`/${locale}/admin/leave-requests`);
    return { success: true, message: "Student leave application successfully submitted." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to apply for leave.",
    };
  }
}

export async function applyTeacherLeaveAction({
  fromDateString,
  toDateString,
  reason,
  locale,
}: {
  fromDateString: string;
  toDateString: string;
  reason: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["TEACHER"]);

  const fromDate = new Date(fromDateString);
  const toDate = new Date(toDateString);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { success: false, message: "Invalid date format." };
  }

  if (fromDate > toDate) {
    return { success: false, message: "From Date must be before or on To Date." };
  }

  if (!reason.trim()) {
    return { success: false, message: "Reason is required." };
  }

  // Find Teacher linked to user
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!teacher) {
    return { success: false, message: "Teacher record not found." };
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        applicantType: "TEACHER",
        teacherId: teacher.id,
        fromDate,
        toDate,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    revalidatePath(`/${locale}/teacher/leave`);
    return { success: true, message: "Leave application successfully submitted to the administrator." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to apply for leave.",
    };
  }
}

export async function reviewLeaveAction({
  leaveId,
  status,
  locale,
}: {
  leaveId: string;
  status: "APPROVED" | "REJECTED";
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await prisma.user.findUnique({
    where: { id: (await requireRole(["TEACHER", "ADMIN"])).user.id },
    select: { id: true, role: true },
  });

  if (!session) {
    return { success: false, message: "Unauthorized access." };
  }

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        student: { select: { sectionId: true } },
      },
    });

    if (!request) {
      return { success: false, message: "Leave request not found." };
    }

    // Role validation:
    // If request is from a Student, the reviewer must be a Teacher assigned as class teacher to that student's section
    if (request.applicantType === "STUDENT") {
      if (session.role === "TEACHER") {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: session.id },
          include: { classTeacherOf: { select: { id: true } } },
        });

        const assignedSectionIds = teacher?.classTeacherOf.map((sec) => sec.id) ?? [];
        if (!request.student?.sectionId || !assignedSectionIds.includes(request.student.sectionId)) {
          return { success: false, message: "Permission denied. You can only review leave requests from students in your assigned class." };
        }
      } else if (session.role !== "ADMIN") {
        return { success: false, message: "Permission denied." };
      }
    }

    // If request is from a Teacher, the reviewer must be an ADMIN
    if (request.applicantType === "TEACHER" && session.role !== "ADMIN") {
      return { success: false, message: "Permission denied. Only admins can review teacher leave requests." };
    }

    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedById: session.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath(`/${locale}/teacher/leave-approval`);
    revalidatePath(`/${locale}/admin/leave-requests`);
    revalidatePath(`/${locale}/teacher/leave`);

    return { success: true, message: `Leave request successfully ${status.toLowerCase()}.` };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to review leave request.",
    };
  }
}
