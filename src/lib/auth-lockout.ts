/**
 * Pure account lockout state transition logic.
 * Enforces DB-backed 5-attempt limit with a 15-minute lockout window.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface LockoutEvaluation {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  hitLimit: boolean;
}

/**
 * Checks whether an account is currently locked.
 */
export function isAccountLocked(
  lockedUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now.getTime();
}

/**
 * Computes remaining lockout duration in milliseconds.
 */
export function getRemainingLockoutMs(
  lockedUntil: Date | null | undefined,
  now: Date = new Date()
): number {
  if (!lockedUntil) return 0;
  return Math.max(0, new Date(lockedUntil).getTime() - now.getTime());
}

/**
 * Evaluates the new account state after a failed authentication attempt.
 */
export function evaluateFailedAttempt(
  currentFailedAttempts: number,
  now: Date = new Date()
): LockoutEvaluation {
  const attempts = Math.max(0, currentFailedAttempts) + 1;
  const hitLimit = attempts >= MAX_FAILED_ATTEMPTS;

  if (hitLimit) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
      hitLimit: true,
    };
  }

  return {
    failedLoginAttempts: attempts,
    lockedUntil: null,
    hitLimit: false,
  };
}

/**
 * Evaluates the new account state after a successful authentication.
 */
export function evaluateSuccessfulLogin(now: Date = new Date()) {
  return {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now,
  };
}
