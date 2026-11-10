import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockSessionUser = {
  id: "admin-user-1",
  role: "ADMIN" as const,
};

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(async () => ({
    user: mockSessionUser,
  })),
}));

let mockDemoMode = false;
vi.mock("@/lib/demo-mode", () => ({
  isDemoMode: () => mockDemoMode,
}));

interface MockUserRow {
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  isActive: boolean;
  passwordHash: string | null;
  mustChangePassword: boolean;
  credentialsIssuedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

interface MockStudentRow {
  id: string;
  userId: string;
  admissionNo: string;
  fullName: string;
  isActive: boolean;
  classId: string;
}

interface MockAuditLogRow {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
}

const {
  mockUsers,
  mockStudents,
  mockClasses,
  mockAuditLogs,
  mockPrismaClient,
} = vi.hoisted(() => {
  const users = new Map<string, MockUserRow>();
  const students = new Map<string, MockStudentRow>();
  const classes = new Map<string, { id: string; name: string }>();
  const auditLogs: MockAuditLogRow[] = [];

  const client = {
    class: {
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id: string };
          select?: {
            sections?: {
              select?: {
                students?: {
                  where?: {
                    isActive?: boolean;
                    user?: {
                      isActive?: boolean;
                      role?: string;
                      credentialsIssuedAt?: null;
                    };
                  };
                };
              };
            };
          };
        }) => {
          const cls = classes.get(where.id);
          if (!cls) return null;

          const studentWhere = select?.sections?.select?.students?.where;
          const requireNullIssuedAt =
            studentWhere?.user && "credentialsIssuedAt" in studentWhere.user
              ? studentWhere.user.credentialsIssuedAt === null
              : false;

          const matchingStudents = Array.from(students.values())
            .filter((stu) => {
              if (stu.classId !== cls.id || !stu.isActive) return false;
              const u = users.get(stu.userId);
              if (!u || !u.isActive || u.role !== "STUDENT") return false;
              if (requireNullIssuedAt && u.credentialsIssuedAt !== null) {
                return false;
              }
              return true;
            })
            .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo))
            .map((stu) => {
              const u = users.get(stu.userId)!;
              return {
                id: stu.id,
                userId: stu.userId,
                admissionNo: stu.admissionNo,
                fullName: stu.fullName,
                user: {
                  credentialsIssuedAt: u.credentialsIssuedAt,
                },
              };
            });

          return {
            id: cls.id,
            name: cls.name,
            sections: [{ students: matchingStudents }],
          };
        }
      ),
    },
    student: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const stu = students.get(where.id);
        if (!stu) return null;
        const u = users.get(stu.userId) ?? null;
        return {
          ...stu,
          user: u
            ? {
                id: u.id,
                role: u.role,
                isActive: u.isActive,
              }
            : null,
        };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return users.get(where.id) ?? null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<MockUserRow>;
        }) => {
          const existing = users.get(where.id);
          if (!existing) throw new Error(`User not found: ${where.id}`);
          const updated = { ...existing, ...data };
          users.set(where.id, updated);
          return updated;
        }
      ),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: MockAuditLogRow }) => {
        auditLogs.push(data);
        return { id: `audit-${auditLogs.length}`, ...data };
      }),
    },
    $transaction: vi.fn(
      async <T>(fn: (tx: typeof client) => Promise<T>): Promise<T> => {
        return fn(client);
      }
    ),
  };

  return {
    mockUsers: users,
    mockStudents: students,
    mockClasses: classes,
    mockAuditLogs: auditLogs,
    mockPrismaClient: client,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrismaClient,
}));

import {
  issueClassCredentialsAction,
  resetStudentPasswordAction,
  unlockStudentAccountAction,
} from "@/app/actions/student-credentials";
import { resetUserPassword } from "@/app/actions/reset-password";

describe("PR 1B-1 — Student Credential Issuance, Reset, Unlock & Hardening", () => {
  beforeEach(() => {
    mockDemoMode = false;
    mockSessionUser = { id: "admin-user-99", role: "ADMIN" };
    mockUsers.clear();
    mockStudents.clear();
    mockClasses.clear();
    mockAuditLogs.length = 0;

    mockClasses.set("class-5", { id: "class-5", name: "5" });

    // Student 1: never issued credentials
    mockUsers.set("u-stu-1", {
      id: "u-stu-1",
      role: "STUDENT",
      isActive: true,
      passwordHash: "old-shared-hash",
      mustChangePassword: false,
      credentialsIssuedAt: null,
      failedLoginAttempts: 3,
      lockedUntil: new Date(Date.now() + 600_000),
    });
    mockStudents.set("stu-1", {
      id: "stu-1",
      userId: "u-stu-1",
      admissionNo: "0001",
      fullName: "Aarav Kumar",
      isActive: true,
      classId: "class-5",
    });

    // Student 2: already issued credentials earlier
    const earlierDate = new Date("2026-11-01T10:00:00Z");
    mockUsers.set("u-stu-2", {
      id: "u-stu-2",
      role: "STUDENT",
      isActive: true,
      passwordHash: "personal-password-hash",
      mustChangePassword: false,
      credentialsIssuedAt: earlierDate,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    mockStudents.set("stu-2", {
      id: "stu-2",
      userId: "u-stu-2",
      admissionNo: "0002",
      fullName: "Meera Devi",
      isActive: true,
      classId: "class-5",
    });
  });

  describe("issueClassCredentialsAction", () => {
    it("issues only to active students with credentialsIssuedAt = null in 'missing' mode and records actor userId in AuditLog without passwords", async () => {
      const res = await issueClassCredentialsAction("class-5", "missing");

      expect(res.ok).toBe(true);
      expect(res.mode).toBe("missing");
      expect(res.className).toBe("5");
      expect(res.slips).toHaveLength(1);

      const slip = res.slips![0];
      expect(slip.admissionNo).toBe("0001");
      expect(slip.fullName).toBe("Aarav Kumar");
      expect(slip.className).toBe("5");
      expect(slip.initialPassword).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{8}$/);

      // Student 1 updated
      const u1 = mockUsers.get("u-stu-1")!;
      expect(await bcrypt.compare(slip.initialPassword, u1.passwordHash!)).toBe(true);
      expect(u1.mustChangePassword).toBe(true);
      expect(u1.credentialsIssuedAt).toBeInstanceOf(Date);
      expect(u1.failedLoginAttempts).toBe(0);
      expect(u1.lockedUntil).toBeNull();

      // Student 2 untouched
      const u2 = mockUsers.get("u-stu-2")!;
      expect(u2.passwordHash).toBe("personal-password-hash");
      expect(u2.mustChangePassword).toBe(false);

      // AuditLog check
      expect(mockAuditLogs).toHaveLength(1);
      const log = mockAuditLogs[0];
      expect(log.userId).toBe("admin-user-99");
      expect(log.action).toBe("STUDENT_CREDENTIALS_ISSUE_CLASS");
      expect(log.entityType).toBe("Class");
      expect(log.entityId).toBe("class-5");
      expect(log.metadata).toEqual({
        className: "5",
        mode: "missing",
        issuedCount: 1,
        reissuedCount: 0,
      });
      expect(JSON.stringify(log.metadata)).not.toContain(slip.initialPassword);
      expect(JSON.stringify(log.metadata)).not.toContain(u1.passwordHash!);
    });

    it("re-issues to all active students in 'all' mode and records reissuedCount in AuditLog", async () => {
      const res = await issueClassCredentialsAction("class-5", "all");

      expect(res.ok).toBe(true);
      expect(res.mode).toBe("all");
      expect(res.slips).toHaveLength(2);
      expect(res.slips!.map((s) => s.admissionNo)).toEqual(["0001", "0002"]);
      expect(res.slips![0].initialPassword).not.toBe(res.slips![1].initialPassword);

      const u2 = mockUsers.get("u-stu-2")!;
      expect(u2.mustChangePassword).toBe(true);
      expect(await bcrypt.compare(res.slips![1].initialPassword, u2.passwordHash!)).toBe(true);

      expect(mockAuditLogs).toHaveLength(1);
      expect(mockAuditLogs[0].userId).toBe("admin-user-99");
      expect(mockAuditLogs[0].metadata).toEqual({
        className: "5",
        mode: "all",
        issuedCount: 2,
        reissuedCount: 1,
      });
    });

    it("returns an error in 'missing' mode when all active students already have credentialsIssuedAt", async () => {
      await issueClassCredentialsAction("class-5", "missing");
      const second = await issueClassCredentialsAction("class-5", "missing");
      expect(second.ok).toBe(false);
      expect(second.error).toContain("already have issued credentials");
    });
  });

  describe("resetStudentPasswordAction & unlockStudentAccountAction", () => {
    it("resets a single student's password, sets mustChangePassword and credentialsIssuedAt, clears lockout, and logs actor userId", async () => {
      const res = await resetStudentPasswordAction("stu-1");

      expect(res.ok).toBe(true);
      expect(res.admissionNo).toBe("0001");
      expect(res.fullName).toBe("Aarav Kumar");
      expect(res.initialPassword).toHaveLength(8);

      const u1 = mockUsers.get("u-stu-1")!;
      expect(u1.mustChangePassword).toBe(true);
      expect(u1.credentialsIssuedAt).toBeInstanceOf(Date);
      expect(u1.failedLoginAttempts).toBe(0);
      expect(u1.lockedUntil).toBeNull();
      expect(await bcrypt.compare(res.initialPassword!, u1.passwordHash!)).toBe(true);

      expect(mockAuditLogs).toHaveLength(1);
      expect(mockAuditLogs[0].userId).toBe("admin-user-99");
      expect(mockAuditLogs[0].action).toBe("STUDENT_PASSWORD_RESET");
      expect(JSON.stringify(mockAuditLogs[0].metadata)).not.toContain(res.initialPassword!);
    });

    it("unlocks a locked student account and writes an AuditLog row with actor userId", async () => {
      const res = await unlockStudentAccountAction("stu-1");

      expect(res.ok).toBe(true);
      const u1 = mockUsers.get("u-stu-1")!;
      expect(u1.failedLoginAttempts).toBe(0);
      expect(u1.lockedUntil).toBeNull();

      expect(mockAuditLogs).toHaveLength(1);
      expect(mockAuditLogs[0].userId).toBe("admin-user-99");
      expect(mockAuditLogs[0].action).toBe("STUDENT_ACCOUNT_UNLOCK");
      expect(mockAuditLogs[0].entityId).toBe("stu-1");
    });
  });

  describe("resetUserPassword hardening (TEACHER-only)", () => {
    it("refuses STUDENT targets", async () => {
      const fd = new FormData();
      fd.set("userId", "u-stu-1");
      fd.set("newPassword", "ValidPass123");
      fd.set("confirmPassword", "ValidPass123");

      await expect(resetUserPassword(fd)).rejects.toThrow(
        "Only teacher passwords can be reset with this action."
      );
      expect(mockUsers.get("u-stu-1")!.passwordHash).toBe("old-shared-hash");
    });

    it("refuses ADMIN targets", async () => {
      mockUsers.set("u-admin-1", {
        id: "u-admin-1",
        role: "ADMIN",
        isActive: true,
        passwordHash: "admin-hash",
        mustChangePassword: false,
        credentialsIssuedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const fd = new FormData();
      fd.set("userId", "u-admin-1");
      fd.set("newPassword", "ValidPass123");
      fd.set("confirmPassword", "ValidPass123");

      await expect(resetUserPassword(fd)).rejects.toThrow(
        "Only teacher passwords can be reset with this action."
      );
      expect(mockUsers.get("u-admin-1")!.passwordHash).toBe("admin-hash");
    });

    it("allows TEACHER targets", async () => {
      mockUsers.set("u-teacher-1", {
        id: "u-teacher-1",
        role: "TEACHER",
        isActive: true,
        passwordHash: "old-teacher-hash",
        mustChangePassword: false,
        credentialsIssuedAt: null,
        failedLoginAttempts: 2,
        lockedUntil: null,
      });

      const fd = new FormData();
      fd.set("userId", "u-teacher-1");
      fd.set("newPassword", "NewTeacher99");
      fd.set("confirmPassword", "NewTeacher99");

      await resetUserPassword(fd);

      const t = mockUsers.get("u-teacher-1")!;
      expect(await bcrypt.compare("NewTeacher99", t.passwordHash!)).toBe(true);
      expect(t.failedLoginAttempts).toBe(0);
    });
  });
});
