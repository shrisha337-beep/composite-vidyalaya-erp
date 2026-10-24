import { describe, it, expect } from "vitest";
import {
  calculateLeaveDays,
  validateTeacherLeaveEligibility,
  calculateDaysInYear,
  calculateCLBalance,
  checkCLExhaustion,
  CL_ANNUAL_LIMIT,
} from "@/lib/leave-rules";

describe("Leave Rules - Calendar Day & Half-Day Calculation", () => {
  it("calculates 1 full day when fromDate equals toDate", () => {
    const date = new Date("2026-03-10");
    expect(calculateLeaveDays(date, date)).toBe(1);
  });

  it("calculates multiple calendar days inclusive", () => {
    const from = new Date("2026-03-10");
    const to = new Date("2026-03-15");
    expect(calculateLeaveDays(from, to)).toBe(6);
  });

  it("throws error if fromDate is after toDate", () => {
    const from = new Date("2026-03-15");
    const to = new Date("2026-03-10");
    expect(() => calculateLeaveDays(from, to)).toThrow(
      "From Date must be before or on To Date."
    );
  });

  it("handles half-day leave as 0.5 days when on the same calendar day", () => {
    const date = new Date("2026-04-05");
    expect(calculateLeaveDays(date, date, true)).toBe(0.5);
  });

  it("throws error if half-day leave spans multiple days", () => {
    const from = new Date("2026-04-05");
    const to = new Date("2026-04-06");
    expect(() => calculateLeaveDays(from, to, true)).toThrow(
      "Half-day leave must start and end on the same calendar day."
    );
  });
});

describe("Leave Rules - Gender-Restricted Leave Types", () => {
  const femaleOnlyTypes = [
    "CHILD_CARE_LEAVE",
    "MATERNITY_LEAVE",
    "ABORTION_LEAVE",
  ] as const;

  femaleOnlyTypes.forEach((leaveType) => {
    it(`allows female teacher to apply for ${leaveType}`, () => {
      const res = validateTeacherLeaveEligibility("FEMALE", leaveType);
      expect(res.allowed).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it(`rejects male teacher for ${leaveType}`, () => {
      const res = validateTeacherLeaveEligibility("MALE", leaveType);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("This leave type is available for female teachers only.");
    });

    it(`rejects teacher with unspecified or other gender for ${leaveType}`, () => {
      expect(validateTeacherLeaveEligibility(null, leaveType).allowed).toBe(false);
      expect(validateTeacherLeaveEligibility(undefined, leaveType).allowed).toBe(false);
      expect(validateTeacherLeaveEligibility("OTHER", leaveType).allowed).toBe(false);
    });
  });

  it("allows all genders to apply for CASUAL_LEAVE and MEDICAL_LEAVE", () => {
    const generalTypes = ["CASUAL_LEAVE", "MEDICAL_LEAVE"];
    const genders = ["MALE", "FEMALE", "OTHER", null, undefined];

    generalTypes.forEach((type) => {
      genders.forEach((gender) => {
        const res = validateTeacherLeaveEligibility(gender, type);
        expect(res.allowed).toBe(true);
      });
    });
  });

  it("rejects unknown or invalid leave types", () => {
    const res = validateTeacherLeaveEligibility("FEMALE", "SABBATICAL");
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Please select a valid leave type.");
  });
});

describe("Leave Rules - Cross-Year Boundaries & Clamping", () => {
  it("returns 0 days when the leave span is entirely in another year", () => {
    const from = new Date("2025-05-01");
    const to = new Date("2025-05-10");
    expect(calculateDaysInYear(from, to, 2026)).toBe(0);
  });

  it("correctly splits a cross-year boundary span between years", () => {
    // Dec 28, 2026 to Jan 3, 2027:
    // Dec 28, 29, 30, 31 = 4 days in 2026
    // Jan 1, 2, 3 = 3 days in 2027
    const from = new Date("2026-12-28");
    const to = new Date("2027-01-03");

    const days2026 = calculateDaysInYear(from, to, 2026);
    const days2027 = calculateDaysInYear(from, to, 2027);

    expect(days2026).toBe(4);
    expect(days2027).toBe(3);
    expect(days2026 + days2027).toBe(calculateLeaveDays(from, to));
  });
});

describe("Leave Rules - Casual Leave Cap (14 Days) & Exhaustion Blocking", () => {
  it("starts with full 14-day balance when no prior leaves taken", () => {
    const balance = calculateCLBalance([], 2026);
    expect(balance.limit).toBe(CL_ANNUAL_LIMIT);
    expect(balance.used).toBe(0);
    expect(balance.remaining).toBe(14);
  });

  it("tracks balance with mixed full days and half days", () => {
    const approved = [
      { fromDate: new Date("2026-02-01"), toDate: new Date("2026-02-03"), isHalfDay: false }, // 3 days
      { fromDate: new Date("2026-03-15"), toDate: new Date("2026-03-15"), isHalfDay: true },  // 0.5 day
      { fromDate: new Date("2026-04-10"), toDate: new Date("2026-04-11"), isHalfDay: false }, // 2 days
    ];

    const balance = calculateCLBalance(approved, 2026);
    expect(balance.used).toBe(5.5);
    expect(balance.remaining).toBe(8.5);
  });

  it("allows application when requested days is within remaining balance", () => {
    const result = checkCLExhaustion(5, 3);
    expect(result.canApply).toBe(true);
    expect(result.shortfall).toBe(0);

    const exactMatch = checkCLExhaustion(3, 3);
    expect(exactMatch.canApply).toBe(true);
    expect(exactMatch.shortfall).toBe(0);
  });

  it("blocks application and reports shortfall when Casual Leave is exhausted", () => {
    // 14 days already used
    const balance = calculateCLBalance(
      [{ fromDate: new Date("2026-01-01"), toDate: new Date("2026-01-14") }],
      2026
    );
    expect(balance.remaining).toBe(0);

    const check = checkCLExhaustion(balance.remaining, 1);
    expect(check.canApply).toBe(false);
    expect(check.shortfall).toBe(1);
  });

  it("blocks application if requested days exceed remaining balance", () => {
    const check = checkCLExhaustion(2, 3);
    expect(check.canApply).toBe(false);
    expect(check.shortfall).toBe(1);
  });
});
