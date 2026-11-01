import { randomInt } from "crypto";

/**
 * Unambiguous uppercase letters and digits (excludes 0, O, 1, I) so primary/junior
 * students and parents can read printed credential slips without confusion.
 */
export const INITIAL_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INITIAL_PASSWORD_LENGTH = 8;
export const LEGACY_SHARED_STUDENT_PASSWORD = "School@123";

/**
 * Generates an 8-character cryptographically random initial password using
 * unambiguous uppercase letters and digits (no symbols).
 */
export function generateInitialStudentPassword(): string {
  let password = "";
  for (let i = 0; i < INITIAL_PASSWORD_LENGTH; i++) {
    const idx = randomInt(0, INITIAL_PASSWORD_ALPHABET.length);
    password += INITIAL_PASSWORD_ALPHABET[idx];
  }
  return password;
}

/**
 * Staff accounts (ADMIN / TEACHER) log in with a 10-digit Indian mobile number.
 */
export function isStaffPhoneIdentifier(identifier: string): boolean {
  return /^\d{10}$/.test(identifier.trim());
}

/**
 * Validates a student's admission number so it is non-empty and never collides
 * with a 10-digit staff mobile number.
 */
export function isValidAdmissionNo(admissionNo: string): boolean {
  const trimmed = admissionNo.trim();
  if (!trimmed || trimmed.length > 32) {
    return false;
  }
  if (isStaffPhoneIdentifier(trimmed)) {
    return false;
  }
  return true;
}

export interface PasswordValidationOptions {
  admissionNo?: string | null;
  phone?: string | null;
  currentPassword?: string | null;
}

/**
 * Validates a user-chosen password on the forced/voluntary password change screen.
 * Returns null if valid, or a descriptive error code if invalid.
 */
export function validateNewPassword(
  newPassword: string,
  options: PasswordValidationOptions = {}
): string | null {
  if (!newPassword || newPassword.length < 8) {
    return "PASSWORD_TOO_SHORT";
  }

  if (newPassword.length > 128) {
    return "PASSWORD_TOO_LONG";
  }

  if (newPassword.toLowerCase() === LEGACY_SHARED_STUDENT_PASSWORD.toLowerCase()) {
    return "PASSWORD_WEAK_DEFAULT";
  }

  if (
    options.currentPassword &&
    newPassword === options.currentPassword
  ) {
    return "PASSWORD_SAME_AS_CURRENT";
  }

  if (
    options.admissionNo &&
    newPassword.trim().toLowerCase() === options.admissionNo.trim().toLowerCase()
  ) {
    return "PASSWORD_MATCHES_IDENTIFIER";
  }

  if (
    options.phone &&
    newPassword.trim() === options.phone.trim()
  ) {
    return "PASSWORD_MATCHES_IDENTIFIER";
  }

  return null;
}

