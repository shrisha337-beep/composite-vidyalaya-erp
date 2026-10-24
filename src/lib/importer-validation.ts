import { z } from "zod";

const ROMAN_MAP: Record<string, string> = {
  I: "1",
  II: "2",
  III: "3",
  IV: "4",
  V: "5",
  VI: "6",
  VII: "7",
  VIII: "8",
};

/**
 * Normalises class string (e.g. "Class 6", "Std 6", "VI") into standard "1"-"8".
 */
export function normaliseClassNumber(raw: string | number): string {
  const str = String(raw).trim();
  let normalised = str
    .replace(/^(class|std|grade|standard)[\s\-.:]*(\d+)$/i, "$2")
    .trim();

  if (ROMAN_MAP[normalised.toUpperCase()]) {
    normalised = ROMAN_MAP[normalised.toUpperCase()];
  }

  return normalised;
}

/**
 * Parses date string in DD/MM/YYYY format into a valid Date object.
 */
export function parseDDMMYYYY(dateStr: string): Date {
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format "${dateStr}" — expected DD/MM/YYYY`);
  }
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values in "${dateStr}"`);
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${dateStr}"`);
  }

  return date;
}

export const studentImportRowSchema = z
  .object({
    admissionNo: z.string().optional(),
    fullName: z.string().min(1, "Name is required"),
    fatherName: z.string().min(1, "Father's name is required"),
    motherName: z.string().optional(),
    gender: z
      .string()
      .refine(
        (val) => ["male", "female", "other"].includes(val.toLowerCase().trim()),
        { message: 'Invalid gender — use "Male", "Female", or "Other"' }
      ),
    dob: z.string().refine(
      (val) => {
        try {
          parseDDMMYYYY(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid date format — use DD/MM/YYYY" }
    ),
    classNumber: z.union([z.string(), z.number()]).transform(normaliseClassNumber).pipe(
      z.enum(["1", "2", "3", "4", "5", "6", "7", "8"], {
        message: "Invalid class — must be 1 to 8",
      })
    ),
    category: z.string().optional(),
    mobile: z.string().optional(),
    village: z.string().optional(),
    district: z.string().optional(),
  });

export type ValidatedImportRow = z.infer<typeof studentImportRowSchema>;

export function validateImportRow(raw: unknown) {
  return studentImportRowSchema.safeParse(raw);
}
