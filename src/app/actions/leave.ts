"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import {
  calculateLeaveDays,
  validateTeacherLeaveEligibility,
  calculateDaysInYear,
  calculateCLBalance,
  checkCLExhaustion,
  CL_ANNUAL_LIMIT,
} from "@/lib/leave-rules";

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

  try {
    calculateLeaveDays(fromDate, toDate);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "From Date must be before or on To Date." };
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
  leaveType,
  locale,
}: {
  fromDateString: string;
  toDateString: string;
  reason: string;
  leaveType: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["TEACHER"]);

  const fromDate = new Date(fromDateString);
  const toDate = new Date(toDateString);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { success: false, message: "Invalid date format." };
  }

  try {
    calculateLeaveDays(fromDate, toDate);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "From Date must be before or on To Date." };
  }

  if (!reason.trim()) {
    return { success: false, message: "Reason is required." };
  }

  // Find Teacher linked to user
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true, gender: true },
  });

  if (!teacher) {
    return { success: false, message: "Teacher record not found." };
  }

  // ─── Eligibility & gender validation via pure rules ─────────────────────
  const eligibility = validateTeacherLeaveEligibility(teacher.gender, leaveType);
  if (!eligibility.allowed) {
    return {
      success: false,
      message: eligibility.reason || "You are not eligible for this leave type.",
    };
  }

  // ─── CL limit enforcement (14 days per calendar year with cross-year overlap) ───
  if (leaveType === "CASUAL_LEAVE") {
    const targetYear = fromDate.getFullYear();
    const requestedDays = calculateDaysInYear(fromDate, toDate, targetYear);

    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

    const approvedCLRequests = await prisma.leaveRequest.findMany({
      where: {
        teacherId: teacher.id,
        leaveType: "CASUAL_LEAVE",
        status: "APPROVED",
        fromDate: { lte: yearEnd },
        toDate: { gte: yearStart },
      },
      select: { fromDate: true, toDate: true },
    });

    const balance = calculateCLBalance(approvedCLRequests, targetYear, CL_ANNUAL_LIMIT);
    const check = checkCLExhaustion(balance.remaining, requestedDays);

    if (!check.canApply) {
      return {
        success: false,
        message: `Cannot apply for ${requestedDays} day(s) of Casual Leave. You have only ${balance.remaining} day(s) remaining out of ${CL_ANNUAL_LIMIT} for this year.`,
      };
    }
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        applicantType: "TEACHER",
        teacherId: teacher.id,
        leaveType: leaveType as any,
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

/**
 * Helper to calculate remaining CL balance for a teacher in the current year.
 */
export async function getTeacherCLBalance(teacherId: string): Promise<{
  used: number;
  remaining: number;
  limit: number;
}> {
  const now = new Date();
  const targetYear = now.getFullYear();
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

  const approvedCLRequests = await prisma.leaveRequest.findMany({
    where: {
      teacherId,
      leaveType: "CASUAL_LEAVE",
      status: "APPROVED",
      fromDate: { lte: yearEnd },
      toDate: { gte: yearStart },
    },
    select: { fromDate: true, toDate: true },
  });

  return calculateCLBalance(approvedCLRequests, targetYear, CL_ANNUAL_LIMIT);
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

/**
 * Admin action: Record a past/previous leave for a teacher.
 * The leave is auto-approved (status = APPROVED) since admin is recording a fact.
 * CL limits are checked based on the fromDate's calendar year.
 */
export async function adminAddPastLeaveAction({
  teacherId,
  leaveType,
  fromDateString,
  toDateString,
  reason,
  locale,
}: {
  teacherId: string;
  leaveType: string;
  fromDateString: string;
  toDateString: string;
  reason: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);

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

  // Validate leaveType
  const validTypes = [
    "CASUAL_LEAVE",
    "MEDICAL_LEAVE",
    "CHILD_CARE_LEAVE",
    "MATERNITY_LEAVE",
    "ABORTION_LEAVE",
  ] as const;
  if (!leaveType || !validTypes.includes(leaveType as typeof validTypes[number])) {
    return { success: false, message: "Please select a valid leave type." };
  }

  // Verify teacher exists
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, gender: true, fullName: true },
  });

  if (!teacher) {
    return { success: false, message: "Teacher record not found." };
  }

  // Gender validation for female-only leave types
  const femaleOnlyTypes = ["CHILD_CARE_LEAVE", "MATERNITY_LEAVE", "ABORTION_LEAVE"];
  if (femaleOnlyTypes.includes(leaveType) && teacher.gender !== "FEMALE") {
    return {
      success: false,
      message: "This leave type is available for female teachers only.",
    };
  }

  // CL limit enforcement (14 days per calendar year)
  if (leaveType === "CASUAL_LEAVE") {
    const CL_ANNUAL_LIMIT = 14;
    const timeDiff = toDate.getTime() - fromDate.getTime();
    const requestedDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    const yearStart = new Date(fromDate.getFullYear(), 0, 1);
    const yearEnd = new Date(fromDate.getFullYear(), 11, 31, 23, 59, 59);

    const approvedCLRequests = await prisma.leaveRequest.findMany({
      where: {
        teacherId: teacher.id,
        leaveType: "CASUAL_LEAVE",
        status: "APPROVED",
        fromDate: { gte: yearStart },
        toDate: { lte: yearEnd },
      },
      select: { fromDate: true, toDate: true },
    });

    let usedDays = 0;
    approvedCLRequests.forEach((req) => {
      const diff = req.toDate.getTime() - req.fromDate.getTime();
      usedDays += Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    });

    const remainingDays = CL_ANNUAL_LIMIT - usedDays;

    if (requestedDays > remainingDays) {
      return {
        success: false,
        message: `Cannot record ${requestedDays} day(s) of CL. ${teacher.fullName} has only ${Math.max(0, remainingDays)} day(s) remaining out of ${CL_ANNUAL_LIMIT} for ${fromDate.getFullYear()}.`,
      };
    }
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        applicantType: "TEACHER",
        teacherId: teacher.id,
        leaveType: leaveType as any,
        fromDate,
        toDate,
        reason: reason.trim(),
        status: "APPROVED",         // Auto-approved — recording a historical fact
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath(`/${locale}/admin/leave-requests`);
    revalidatePath(`/${locale}/teacher/leave`);
    return {
      success: true,
      message: `Past leave for ${teacher.fullName} successfully recorded and approved.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to record past leave.",
    };
  }
}
