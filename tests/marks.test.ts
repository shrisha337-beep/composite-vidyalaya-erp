import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateSingleMark,
  validateMarksBatch,
  getMaxMarksForTerm,
  TERM_MAX_MARKS,
  ExamTerm,
} from "@/lib/marks-validation";

// Mocks for saveStudentMarksAction
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subject: {
      findUnique: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
    },
    teacherSubject: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveStudentMarksAction } from "@/app/actions/save-marks";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

describe("Marks Validation - 10 + 10 + 30 + 50 Examination Scheme", () => {
  it("defines exact maximum limits for each term", () => {
    expect(getMaxMarksForTerm("UNIT_TEST_1")).toBe(10);
    expect(getMaxMarksForTerm("UNIT_TEST_2")).toBe(10);
    expect(getMaxMarksForTerm("HALF_YEARLY")).toBe(30);
    expect(getMaxMarksForTerm("ANNUAL")).toBe(50);

    const totalYearMarks =
      TERM_MAX_MARKS.UNIT_TEST_1 +
      TERM_MAX_MARKS.UNIT_TEST_2 +
      TERM_MAX_MARKS.HALF_YEARLY +
      TERM_MAX_MARKS.ANNUAL;
    expect(totalYearMarks).toBe(100);
  });

  describe("Enforces maximum boundaries per exam term", () => {
    const termTestCases: { term: ExamTerm; max: number }[] = [
      { term: "UNIT_TEST_1", max: 10 },
      { term: "UNIT_TEST_2", max: 10 },
      { term: "HALF_YEARLY", max: 30 },
      { term: "ANNUAL", max: 50 },
    ];

    termTestCases.forEach(({ term, max }) => {
      it(`accepts valid marks from 0 to ${max} for ${term}`, () => {
        expect(validateSingleMark(term, 0).valid).toBe(true);
        expect(validateSingleMark(term, max / 2).valid).toBe(true);
        expect(validateSingleMark(term, max).valid).toBe(true);
      });

      it(`rejects marks exceeding ${max} for ${term}`, () => {
        const check = validateSingleMark(term, max + 0.5);
        expect(check.valid).toBe(false);
        expect(check.error).toContain(`exceed maximum limit of ${max}`);

        expect(validateSingleMark(term, max + 10).valid).toBe(false);
      });

      it(`rejects negative marks for ${term}`, () => {
        const check = validateSingleMark(term, -1);
        expect(check.valid).toBe(false);
        expect(check.error).toBe("Marks cannot be negative.");
      });
    });

    it("rejects NaN or non-number values", () => {
      expect(validateSingleMark("UNIT_TEST_1", NaN).valid).toBe(false);
      expect(validateSingleMark("UNIT_TEST_1", undefined as any).valid).toBe(false);
    });
  });

  describe("Duplicate Student Marks Rejection in Batch", () => {
    it("validates a batch of distinct students with valid marks", () => {
      const batch = [
        { studentId: "s-1", marksObtained: 8 },
        { studentId: "s-2", marksObtained: 10 },
        { studentId: "s-3", marksObtained: 7.5 },
      ];

      const res = validateMarksBatch(batch, "UNIT_TEST_1");
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("rejects batch if duplicate student IDs are present", () => {
      const batchWithDuplicates = [
        { studentId: "s-1", marksObtained: 8 },
        { studentId: "s-2", marksObtained: 9 },
        { studentId: "s-1", marksObtained: 10 }, // Duplicate s-1
      ];

      const res = validateMarksBatch(batchWithDuplicates, "UNIT_TEST_1");
      expect(res.valid).toBe(false);
      expect(res.duplicateStudentIds).toContain("s-1");
      expect(res.error).toContain("Duplicate student entries detected");
    });

    it("rejects batch if any single mark exceeds term maximum", () => {
      const batch = [
        { studentId: "s-1", marksObtained: 8 },
        { studentId: "s-2", marksObtained: 12 }, // Exceeds 10 for UNIT_TEST_1
      ];

      const res = validateMarksBatch(batch, "UNIT_TEST_1");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceed maximum limit of 10");
    });
  });
});

describe("Marks Entry Action - saveStudentMarksAction Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireRole as any).mockResolvedValue({
      user: { id: "teacher-user-1", role: "TEACHER" },
    });
  });

  it("rejects when required parameters are missing", async () => {
    const res = await saveStudentMarksAction({
      marksRecords: [],
      subjectId: "",
      examTerm: "UNIT_TEST_1",
      locale: "hi",
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe("Missing required parameters.");
  });

  it("rejects if subject does not exist", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue(null);

    const res = await saveStudentMarksAction({
      marksRecords: [{ studentId: "s-1", marksObtained: 8 }],
      subjectId: "sub-unknown",
      examTerm: "UNIT_TEST_1",
      locale: "hi",
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe("Subject not found.");
  });

  it("rejects if teacher is not assigned to the subject", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue({
      id: "sub-1",
      class: { sessionId: "sess-1", name: "6" },
    });
    (prisma.teacher.findUnique as any).mockResolvedValue({ id: "t-1" });
    (prisma.teacherSubject.findUnique as any).mockResolvedValue(null);

    const res = await saveStudentMarksAction({
      marksRecords: [{ studentId: "s-1", marksObtained: 8 }],
      subjectId: "sub-1",
      examTerm: "UNIT_TEST_1",
      locale: "hi",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("You are not assigned to this subject");
  });

  it("rejects when a student record has marks exceeding term maximum", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue({
      id: "sub-1",
      class: { sessionId: "sess-1", name: "6" },
    });
    (prisma.teacher.findUnique as any).mockResolvedValue({ id: "t-1" });
    (prisma.teacherSubject.findUnique as any).mockResolvedValue({ id: "ts-1" });

    const res = await saveStudentMarksAction({
      marksRecords: [
        { studentId: "s-1", marksObtained: 8 },
        { studentId: "s-2", marksObtained: 35 }, // Exceeds 30 for HALF_YEARLY
      ],
      subjectId: "sub-1",
      examTerm: "HALF_YEARLY",
      locale: "hi",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("exceed maximum limit of 30");
  });

  it("regression: rejects batch containing duplicate student IDs before transaction is opened", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue({
      id: "sub-1",
      class: { sessionId: "sess-1", name: "6" },
    });
    (prisma.teacher.findUnique as any).mockResolvedValue({ id: "t-1" });
    (prisma.teacherSubject.findUnique as any).mockResolvedValue({ id: "ts-1" });

    const res = await saveStudentMarksAction({
      marksRecords: [
        { studentId: "s-1", marksObtained: 8 },
        { studentId: "s-1", marksObtained: 9 }, // duplicate studentId in same batch
      ],
      subjectId: "sub-1",
      examTerm: "UNIT_TEST_1",
      locale: "hi",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("Duplicate student entries detected in marks batch: s-1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("successfully persists marks in a single transaction when valid", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue({
      id: "sub-1",
      class: { sessionId: "sess-1", name: "6" },
    });
    (prisma.teacher.findUnique as any).mockResolvedValue({ id: "t-1" });
    (prisma.teacherSubject.findUnique as any).mockResolvedValue({ id: "ts-1" });

    const mockDeleteMany = vi.fn();
    const mockCreateMany = vi.fn();
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      return cb({
        mark: {
          deleteMany: mockDeleteMany,
          createMany: mockCreateMany,
        },
      });
    });

    const res = await saveStudentMarksAction({
      marksRecords: [
        { studentId: "s-1", marksObtained: 9 },
        { studentId: "s-2", marksObtained: 10 },
      ],
      subjectId: "sub-1",
      examTerm: "UNIT_TEST_1",
      locale: "hi",
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain("Marks successfully saved for 2 students.");
    expect(mockDeleteMany).toHaveBeenCalled();
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          studentId: "s-1",
          subjectId: "sub-1",
          sessionId: "sess-1",
          examTerm: "UNIT_TEST_1",
          marksObtained: 9,
          maxMarks: 10,
          enteredById: "teacher-user-1",
        },
        {
          studentId: "s-2",
          subjectId: "sub-1",
          sessionId: "sess-1",
          examTerm: "UNIT_TEST_1",
          marksObtained: 10,
          maxMarks: 10,
          enteredById: "teacher-user-1",
        },
      ],
    });
  });
});
