import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isAccountLocked,
  evaluateFailedAttempt,
  evaluateSuccessfulLogin,
  getRemainingLockoutMs,
} from "@/lib/auth-lockout";

// Mock prisma and bcrypt before importing authOptions
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

describe("Account Lockout - Pure State Evaluation", () => {
  it("allows login when lockedUntil is null or past", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    expect(isAccountLocked(null, now)).toBe(false);
    expect(isAccountLocked(undefined, now)).toBe(false);

    const pastDate = new Date("2026-10-25T09:59:00Z");
    expect(isAccountLocked(pastDate, now)).toBe(false);
    expect(getRemainingLockoutMs(pastDate, now)).toBe(0);
  });

  it("locks account when lockedUntil is in the future (no early unlock)", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    const futureDate = new Date("2026-10-25T10:14:00Z");

    expect(isAccountLocked(futureDate, now)).toBe(true);
    expect(getRemainingLockoutMs(futureDate, now)).toBe(14 * 60 * 1000);
  });

  it("increments failed attempts without locking if below 5", () => {
    const now = new Date("2026-10-25T10:00:00Z");

    for (let attempts = 0; attempts < 4; attempts++) {
      const result = evaluateFailedAttempt(attempts, now);
      expect(result.failedLoginAttempts).toBe(attempts + 1);
      expect(result.lockedUntil).toBeNull();
      expect(result.hitLimit).toBe(false);
    }
  });

  it("locks for exactly 15 minutes on the 5th consecutive failure and resets attempts counter", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    const result = evaluateFailedAttempt(4, now);

    expect(result.hitLimit).toBe(true);
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockedUntil).toEqual(new Date(now.getTime() + 15 * 60 * 1000));
  });

  it("resets failed attempts and lockout on successful login", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    const result = evaluateSuccessfulLogin(now);

    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockedUntil).toBeNull();
    expect(result.lastLoginAt).toEqual(now);
  });
});

describe("Account Lockout & Credentials Authentication - Integration with Mocked DB", () => {
  const provider = authOptions.providers[0];
  const authorize = (provider as any).options.authorize;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns uniform INVALID_CREDENTIALS error when phone does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      authorize({ phone: "9000000003", password: "SecretPassword123" })
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { phone: "9000000003" },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns uniform INVALID_CREDENTIALS error when user is inactive or passwordHash missing", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: null,
      isActive: true,
      role: "TEACHER",
    });

    await expect(
      authorize({ phone: "9000000003", password: "SecretPassword123" })
    ).rejects.toThrow("INVALID_CREDENTIALS");

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "hash123",
      isActive: false,
      role: "TEACHER",
    });

    await expect(
      authorize({ phone: "9000000003", password: "SecretPassword123" })
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("returns uniform INVALID_CREDENTIALS error when role is not ADMIN or TEACHER", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "hash123",
      isActive: true,
      role: "STUDENT",
    });

    await expect(
      authorize({ phone: "9000000003", password: "SecretPassword123" })
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("rejects immediately with ACCOUNT_LOCKED if account has active lockout without checking password", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "hash123",
      isActive: true,
      role: "TEACHER",
      lockedUntil,
      failedLoginAttempts: 0,
    });

    await expect(
      authorize({ phone: "9000000003", password: "SecretPassword123" })
    ).rejects.toThrow("ACCOUNT_LOCKED");

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("increments failedLoginAttempts and throws uniform INVALID_CREDENTIALS on wrong password", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "hash123",
      isActive: true,
      role: "TEACHER",
      lockedUntil: null,
      failedLoginAttempts: 2,
    });
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authorize({ phone: "9000000003", password: "WrongPassword" })
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { failedLoginAttempts: 3 },
    });
  });

  it("locks account for 15 minutes when 5th failed password attempt occurs", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "hash123",
      isActive: true,
      role: "TEACHER",
      lockedUntil: null,
      failedLoginAttempts: 4,
    });
    (bcrypt.compare as any).mockResolvedValue(false);

    const beforeTime = Date.now();
    await expect(
      authorize({ phone: "9000000003", password: "WrongPassword" })
    ).rejects.toThrow("ACCOUNT_LOCKED");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: expect.objectContaining({
        failedLoginAttempts: 0,
        lockedUntil: expect.any(Date),
      }),
    });

    const updateCall = (prisma.user.update as any).mock.calls[0][0];
    const lockedUntilTime = new Date(updateCall.data.lockedUntil).getTime();
    expect(lockedUntilTime).toBeGreaterThanOrEqual(beforeTime + 14 * 60 * 1000);
  });

  it("resets failedLoginAttempts and clears lockedUntil on successful password match", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u-1",
      phone: "9000000003",
      passwordHash: "correct_hash",
      isActive: true,
      role: "ADMIN",
      lockedUntil: null,
      failedLoginAttempts: 3,
      email: "admin@school.up.gov.in",
    });
    (bcrypt.compare as any).mockResolvedValue(true);

    const user = await authorize({ phone: "9000000003", password: "CorrectPassword123" });

    expect(user).toEqual({
      id: "u-1",
      role: "ADMIN",
      phone: "9000000003",
      email: "admin@school.up.gov.in",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: expect.any(Date),
      },
    });
  });
});
