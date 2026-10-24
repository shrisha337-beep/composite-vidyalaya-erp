/**
 * Pure marks and exam validation rules for UP continuous evaluation.
 * Enforces 10 + 10 + 30 + 50 = 100 model.
 */

export type ExamTerm = "UNIT_TEST_1" | "UNIT_TEST_2" | "HALF_YEARLY" | "ANNUAL";

export const TERM_MAX_MARKS: Record<ExamTerm, number> = {
  UNIT_TEST_1: 10,
  UNIT_TEST_2: 10,
  HALF_YEARLY: 30,
  ANNUAL: 50,
};

export interface StudentMarkEntry {
  studentId: string;
  marksObtained: number;
}

export function getMaxMarksForTerm(term: ExamTerm): number {
  const max = TERM_MAX_MARKS[term];
  if (max === undefined) {
    throw new Error(`Invalid exam term "${term}"`);
  }
  return max;
}

export function validateSingleMark(
  term: ExamTerm,
  marksObtained: number
): { valid: boolean; error?: string } {
  const maxMarks = getMaxMarksForTerm(term);

  if (typeof marksObtained !== "number" || isNaN(marksObtained)) {
    return { valid: false, error: "Marks must be a valid number." };
  }

  if (marksObtained < 0) {
    return { valid: false, error: "Marks cannot be negative." };
  }

  if (marksObtained > maxMarks) {
    return {
      valid: false,
      error: `Marks ${marksObtained} exceed maximum limit of ${maxMarks} for ${term.replace(/_/g, " ")}.`,
    };
  }

  return { valid: true };
}

export function validateMarksBatch(
  entries: StudentMarkEntry[],
  term: ExamTerm
): { valid: boolean; error?: string; duplicateStudentIds?: string[] } {
  if (!entries || entries.length === 0) {
    return { valid: false, error: "No marks records provided." };
  }

  const seenStudentIds = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.studentId || !entry.studentId.trim()) {
      return { valid: false, error: "Missing student ID in mark record." };
    }

    if (seenStudentIds.has(entry.studentId)) {
      duplicateIds.add(entry.studentId);
    }
    seenStudentIds.add(entry.studentId);

    const check = validateSingleMark(term, entry.marksObtained);
    if (!check.valid) {
      return { valid: false, error: check.error };
    }
  }

  if (duplicateIds.size > 0) {
    return {
      valid: false,
      error: `Duplicate student entries detected in marks batch: ${Array.from(duplicateIds).join(", ")}. Each student must appear at most once per subject and exam term.`,
      duplicateStudentIds: Array.from(duplicateIds),
    };
  }

  return { valid: true };
}
