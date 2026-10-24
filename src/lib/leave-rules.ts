/**
 * Pure business logic for teacher and staff leave management.
 * Enforces UP state educational service rules.
 */

export const CL_ANNUAL_LIMIT = 14;

export const FEMALE_ONLY_LEAVE_TYPES = [
  "CHILD_CARE_LEAVE",
  "MATERNITY_LEAVE",
  "ABORTION_LEAVE",
] as const;

export const ALL_LEAVE_TYPES = [
  "CASUAL_LEAVE",
  "MEDICAL_LEAVE",
  "CHILD_CARE_LEAVE",
  "MATERNITY_LEAVE",
  "ABORTION_LEAVE",
] as const;

export type LeaveType = (typeof ALL_LEAVE_TYPES)[number];

export interface TeacherProfile {
  id: string;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
}

export interface LeaveSpan {
  fromDate: Date;
  toDate: Date;
  isHalfDay?: boolean;
}

/**
 * Calculates number of calendar days between fromDate and toDate inclusive.
 */
export function calculateLeaveDays(fromDate: Date, toDate: Date, isHalfDay = false): number {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  if (start.getTime() > end.getTime()) {
    throw new Error("From Date must be before or on To Date.");
  }

  const diffMs = end.getTime() - start.getTime();
  const fullDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

  if (isHalfDay) {
    if (fullDays !== 1) {
      throw new Error("Half-day leave must start and end on the same calendar day.");
    }
    return 0.5;
  }

  return fullDays;
}

/**
 * Validates whether a teacher is eligible to apply for a given leave type based on gender.
 */
export function validateTeacherLeaveEligibility(
  gender: string | null | undefined,
  leaveType: string
): { allowed: boolean; reason?: string } {
  if (!ALL_LEAVE_TYPES.includes(leaveType as LeaveType)) {
    return { allowed: false, reason: "Please select a valid leave type." };
  }

  const isFemaleOnly = (FEMALE_ONLY_LEAVE_TYPES as readonly string[]).includes(leaveType);
  if (isFemaleOnly && gender !== "FEMALE") {
    return {
      allowed: false,
      reason: "This leave type is available for female teachers only.",
    };
  }

  return { allowed: true };
}

/**
 * Calculates leave days falling specifically within a given calendar year.
 * Handles cross-year boundary spans (e.g. Dec 28 to Jan 3).
 */
export function calculateDaysInYear(
  fromDate: Date,
  toDate: Date,
  targetYear: number,
  isHalfDay = false
): number {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  const yearStart = new Date(targetYear, 0, 1, 0, 0, 0);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

  // If entire span is outside target year
  if (end < yearStart || start > yearEnd) {
    return 0;
  }

  // Clamp span to target year
  const clampedStart = start < yearStart ? yearStart : start;
  const clampedEnd = end > yearEnd ? yearEnd : end;

  return calculateLeaveDays(clampedStart, clampedEnd, isHalfDay);
}

/**
 * Computes remaining Casual Leave balance for a given year.
 */
export function calculateCLBalance(
  approvedLeaves: LeaveSpan[],
  targetYear: number,
  limit: number = CL_ANNUAL_LIMIT
): { used: number; remaining: number; limit: number } {
  let used = 0;

  for (const leave of approvedLeaves) {
    used += calculateDaysInYear(leave.fromDate, leave.toDate, targetYear, leave.isHalfDay);
  }

  return {
    used,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

/**
 * Verifies if requested CL exceeds the remaining annual quota.
 */
export function checkCLExhaustion(
  currentBalanceRemaining: number,
  requestedDays: number
): { canApply: boolean; shortfall: number } {
  if (requestedDays <= currentBalanceRemaining) {
    return { canApply: true, shortfall: 0 };
  }

  return {
    canApply: false,
    shortfall: requestedDays - currentBalanceRemaining,
  };
}
