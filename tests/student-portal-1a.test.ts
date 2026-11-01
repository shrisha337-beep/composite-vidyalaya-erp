import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock react cache (per-request memoisation)
vi.mock("react", () => ({
  cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

// Mock next/cache unstable_cache with an in-memory map keyed by serialized keyParts
const unstableCacheStore = new Map<string, unknown>();

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    keyParts?: string[]
  ) => {
    return async (...args: Parameters<T>) => {
      const key = JSON.stringify(keyParts ?? []);
      if (unstableCacheStore.has(key)) {
        return unstableCacheStore.get(key);
      }
      const val = await fn(...args);
      unstableCacheStore.set(key, val);
      return val;
    };
  },
  revalidatePath: vi.fn(),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  (err as unknown as { digest: string }).digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw err;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock demo mode
let mockDemoMode = false;
vi.mock("@/lib/demo-mode", () => ({
  isDemoMode: () => mockDemoMode,
}));

// In-memory mock DB state
interface MockUser {
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  phone: string;
  email: string | null;
  passwordHash: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

interface MockStudent {
  id: string;
  userId: string;
  admissionNo: string;
  fullName: string;
  isActive: boolean;
  sectionId: string | null;
  section: {
    id: string;
    name: string;
    classId: string;
    class: {
      id: string;
      name: string;
      sessionId: string;
      session: { label: string };
    };
  } | null;
}

let mockPortalEnabled = false;
const mockUsers = new Map<string, MockUser>();
const mockStudentsByAdmNo = new Map<string, MockStudent>();
const mockStudentsByUserId = new Map<string, MockStudent>();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schoolSettings: {
      findUnique: vi.fn(async () => ({
        id: "singleton",
        studentPortalEnabled: mockPortalEnabled,
      })),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; phone?: string } }) => {
        if (where.id) {
          const u = mockUsers.get(where.id) ?? null;
          if (!u) return null;
          const student = mockStudentsByUserId.get(u.id);
          return {
            ...u,
            student: student ? { admissionNo: student.admissionNo } : null,
          };
        }
        if (where.phone) {
          for (const u of mockUsers.values()) {
            if (u.phone === where.phone) return { ...u };
          }
        }
        return null;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<MockUser>;
        }) => {
          const existing = mockUsers.get(where.id);
          if (!existing) throw new Error("User not found");
          const updated: MockUser = { ...existing, ...data };
          mockUsers.set(where.id, updated);
          return updated;
        }
      ),
    },
    student: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { admissionNo?: string; userId?: string };
        }) => {
          if (where.admissionNo) {
            const s = mockStudentsByAdmNo.get(where.admissionNo);
            if (!s) return null;
            const u = mockUsers.get(s.userId) ?? null;
            return { ...s, user: u ? { ...u } : null };
          }
          if (where.userId) {
            const s = mockStudentsByUserId.get(where.userId);
            return s ? { ...s } : null;
          }
          return null;
        }
      ),
    },
  },
}));

// Mock next-auth getServerSession
let mockSession: {
  user?: {
    id: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    mustChangePassword?: boolean;
    phone?: string;
  };
} | null = null;

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

import {
  generateInitialStudentPassword,
  INITIAL_PASSWORD_ALPHABET,
  INITIAL_PASSWORD_LENGTH,
  isStaffPhoneIdentifier,
  isValidAdmissionNo,
  validateNewPassword,
} from "@/lib/student-credentials";
import { isStudentPortalEnabled } from "@/lib/data/school-settings";
import { authOptions } from "@/lib/auth";
import { requireRole, requireStudent } from "@/lib/rbac";
import { changeOwnPasswordAction } from "@/app/actions/change-password";
import Home from "@/app/[locale]/page";

const credentialsProvider = authOptions.providers[0] as unknown as {
  options: {
    authorize: (credentials: {
      phone: string;
      password: string;
    }) => Promise<{
      id: string;
      role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
      mustChangePassword: boolean;
      phone: string;
    }>;
  };
};
const authorizeCredentials = credentialsProvider.options.authorize;

describe("Student Portal PR 1A — Credentials, Switch, Auth, and Forced Change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unstableCacheStore.clear();
    mockUsers.clear();
    mockStudentsByAdmNo.clear();
    mockStudentsByUserId.clear();
    mockPortalEnabled = false;
    mockDemoMode = false;
    mockSession = null;
  });

  describe("1. Password Generator & Policy Rules", () => {
    it("generates 8-char unambiguous uppercase+digit passwords with no 0/O/1/I or symbols", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const pwd = generateInitialStudentPassword();
        expect(pwd).toHaveLength(INITIAL_PASSWORD_LENGTH);
        for (const ch of pwd) {
          expect(INITIAL_PASSWORD_ALPHABET.includes(ch)).toBe(true);
        }
        expect(/[0O1I]/.test(pwd)).toBe(false);
        seen.add(pwd);
      }
      expect(seen.size).toBeGreaterThan(45);
    });

    it("enforces password validation rules (min 8 chars, no School@123, no admissionNo/phone, no reuse)", () => {
      expect(validateNewPassword("Short1")).toBe("PASSWORD_TOO_SHORT");
      expect(validateNewPassword("School@123")).toBe("PASSWORD_WEAK_DEFAULT");
      expect(validateNewPassword("school@123")).toBe("PASSWORD_WEAK_DEFAULT");
      expect(
        validateNewPassword("0142", { admissionNo: "0142" })
      ).toBe("PASSWORD_TOO_SHORT");
      expect(
        validateNewPassword("ADM2026001", { admissionNo: "ADM2026001" })
      ).toBe("PASSWORD_MATCHES_IDENTIFIER");
      expect(
        validateNewPassword("9876543210", { phone: "9876543210" })
      ).toBe("PASSWORD_MATCHES_IDENTIFIER");
      expect(
        validateNewPassword("K7M4P9X2", { currentPassword: "K7M4P9X2" })
      ).toBe("PASSWORD_SAME_AS_CURRENT");
      expect(
        validateNewPassword("StrongPass99", {
          admissionNo: "0142",
          phone: "9876543210",
          currentPassword: "K7M4P9X2",
        })
      ).toBeNull();
    });

    it("prevents admission numbers from colliding with 10-digit staff mobile numbers", () => {
      expect(isStaffPhoneIdentifier("9876543210")).toBe(true);
      expect(isStaffPhoneIdentifier("0142")).toBe(false);
      expect(isValidAdmissionNo("0142")).toBe(true);
      expect(isValidAdmissionNo("ADM2026001")).toBe(true);
      expect(isValidAdmissionNo("9876543210")).toBe(false);
      expect(isValidAdmissionNo("   ")).toBe(false);
    });
  });

  describe("2. Admission-Number vs Phone Login Routing & Switch Enforcement", () => {
    const initialHash = bcrypt.hashSync("K7M4P9X2", 10);
    const legacyHash = bcrypt.hashSync("School@123", 10);
    const staffHash = bcrypt.hashSync("StaffSecret99", 10);

    function seedStudent(overrides?: Partial<MockUser>) {
      const user: MockUser = {
        id: "usr-stu-1",
        role: "STUDENT",
        phone: "9876543210", // even if student shares parent's 10-digit phone
        email: null,
        passwordHash: initialHash,
        mustChangePassword: true,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        ...overrides,
      };
      const student: MockStudent = {
        id: "stu-1",
        userId: user.id,
        admissionNo: "0142",
        fullName: "Aarav Verma",
        isActive: true,
        sectionId: "sec-5a",
        section: {
          id: "sec-5a",
          name: "A",
          classId: "cls-5",
          class: {
            id: "cls-5",
            name: "5",
            sessionId: "sess-1",
            session: { label: "2026-2027" },
          },
        },
      };
      mockUsers.set(user.id, user);
      mockStudentsByAdmNo.set(student.admissionNo, student);
      mockStudentsByUserId.set(user.id, student);
      return { user, student };
    }

    function seedStaff(role: "ADMIN" | "TEACHER", phone: string) {
      const user: MockUser = {
        id: `usr-${role.toLowerCase()}`,
        role,
        phone,
        email: null,
        passwordHash: staffHash,
        mustChangePassword: false,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
      };
      mockUsers.set(user.id, user);
      return user;
    }

    it("allows ADMIN and TEACHER to log in with a 10-digit phone while studentPortalEnabled is false, rejects wrong password with INVALID_CREDENTIALS, and enforces lockout", async () => {
      mockPortalEnabled = false;
      seedStaff("ADMIN", "9000000001");
      seedStaff("TEACHER", "9000000002");

      const adminAuth = await authorizeCredentials({
        phone: "9000000001",
        password: "StaffSecret99",
      });
      expect(adminAuth).toMatchObject({
        id: "usr-admin",
        role: "ADMIN",
        phone: "9000000001",
      });

      const teacherAuth = await authorizeCredentials({
        phone: "9000000002",
        password: "StaffSecret99",
      });
      expect(teacherAuth).toMatchObject({
        id: "usr-teacher",
        role: "TEACHER",
        phone: "9000000002",
      });

      // Wrong password on attempts 1-4 returns INVALID_CREDENTIALS
      for (let attempt = 1; attempt <= 4; attempt++) {
        await expect(
          authorizeCredentials({
            phone: "9000000002",
            password: "WrongPassword1",
          })
        ).rejects.toThrow("INVALID_CREDENTIALS");
      }

      // 5th consecutive failed attempt locks the staff account
      await expect(
        authorizeCredentials({
          phone: "9000000002",
          password: "WrongPassword1",
        })
      ).rejects.toThrow("ACCOUNT_LOCKED");

      await expect(
        authorizeCredentials({
          phone: "9000000002",
          password: "StaffSecret99",
        })
      ).rejects.toThrow("ACCOUNT_LOCKED");
    });

    it("rejects student login when studentPortalEnabled is false", async () => {
      seedStudent();
      mockPortalEnabled = false;

      await expect(
        authorizeCredentials({
          phone: "0142",
          password: "K7M4P9X2",
        })
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("never authenticates a STUDENT via a 10-digit phone number even when portal is enabled", async () => {
      seedStudent();
      mockPortalEnabled = true;

      await expect(
        authorizeCredentials({
          phone: "9876543210",
          password: "K7M4P9X2",
        })
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("rejects the legacy shared password 'School@123' even if stored in DB and portal is enabled", async () => {
      seedStudent({ passwordHash: legacyHash });
      mockPortalEnabled = true;

      await expect(
        authorizeCredentials({
          phone: "0142",
          password: "School@123",
        })
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("allows student login via admission number when studentPortalEnabled is true", async () => {
      seedStudent();
      mockPortalEnabled = true;

      const authUser = await authorizeCredentials({
        phone: "0142",
        password: "K7M4P9X2",
      });

      expect(authUser).toMatchObject({
        id: "usr-stu-1",
        role: "STUDENT",
        mustChangePassword: true,
      });
    });

    it("locks student account on the 5th consecutive failed password attempt", async () => {
      seedStudent();
      mockPortalEnabled = true;

      for (let attempt = 1; attempt <= 4; attempt++) {
        await expect(
          authorizeCredentials({
            phone: "0142",
            password: "WRONGPASS",
          })
        ).rejects.toThrow("INVALID_CREDENTIALS");
      }

      await expect(
        authorizeCredentials({
          phone: "0142",
          password: "WRONGPASS",
        })
      ).rejects.toThrow("ACCOUNT_LOCKED");

      // Subsequent attempt with the RIGHT password while locked still throws ACCOUNT_LOCKED
      await expect(
        authorizeCredentials({
          phone: "0142",
          password: "K7M4P9X2",
        })
      ).rejects.toThrow("ACCOUNT_LOCKED");
    });
  });

  describe("3. Forced Password Change Flow & Zero Redirect-Loop Verification", () => {
    it("redirects mustChangePassword=true to /change-password, updates DB & JWT on change, and then reaches /student/dashboard without looping", async () => {
      const initialHash = await bcrypt.hash("K7M4P9X2", 10);
      mockPortalEnabled = true;

      const user: MockUser = {
        id: "usr-stu-loop",
        role: "STUDENT",
        phone: "NOPHONE-0142-1",
        email: null,
        passwordHash: initialHash,
        mustChangePassword: true,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
      };
      const student: MockStudent = {
        id: "stu-loop",
        userId: user.id,
        admissionNo: "0142",
        fullName: "Priya Sharma",
        isActive: true,
        sectionId: "sec-6a",
        section: {
          id: "sec-6a",
          name: "A",
          classId: "cls-6",
          class: {
            id: "cls-6",
            name: "6",
            sessionId: "sess-1",
            session: { label: "2026-2027" },
          },
        },
      };
      mockUsers.set(user.id, user);
      mockStudentsByAdmNo.set(student.admissionNo, student);
      mockStudentsByUserId.set(user.id, student);

      // Step 1: Student signs in with initial password
      const authorizedUser = await authorizeCredentials({
        phone: "0142",
        password: "K7M4P9X2",
      });
      expect(authorizedUser.mustChangePassword).toBe(true);

      // Step 2: NextAuth builds initial JWT & Session
      const jwtCallback = authOptions.callbacks!.jwt!;
      const sessionCallback = authOptions.callbacks!.session!;

      let token = await jwtCallback({
        token: { id: "", role: "STUDENT" },
        user: authorizedUser,
        account: null,
      });
      expect(token.mustChangePassword).toBe(true);

      let currentSession = (await sessionCallback({
        session: {
          user: { id: "", role: "STUDENT" },
          expires: "2026-11-01T12:00:00Z",
        },
        token,
        user: authorizedUser as never,
        newSession: undefined,
        trigger: "update",
      })) as NonNullable<typeof mockSession> & { expires: string };
      mockSession = currentSession;

      // Step 3: Visiting "/" or calling requireStudent() while mustChangePassword=true redirects to /change-password
      await expect(
        Home({ params: Promise.resolve({ locale: "hi" }) })
      ).rejects.toThrow("NEXT_REDIRECT: /hi/change-password");

      await expect(requireStudent()).rejects.toThrow(
        "NEXT_REDIRECT: /change-password"
      );

      // Step 4: Student submits ChangePasswordForm -> calls changeOwnPasswordAction
      const changeRes = await changeOwnPasswordAction({
        currentPassword: "K7M4P9X2",
        newPassword: "MyNewSecret99",
        confirmPassword: "MyNewSecret99",
      });
      expect(changeRes).toEqual({ ok: true });
      expect(mockUsers.get(user.id)?.mustChangePassword).toBe(false);

      // Step 5: Client calls useSession().update({ mustChangePassword: false })
      // which triggers NextAuth jwt callback with `trigger: "update"`.
      token = await jwtCallback({
        token,
        user: undefined as never,
        account: null,
        trigger: "update",
        session: { mustChangePassword: false },
      });
      expect(token.mustChangePassword).toBe(false);

      currentSession = (await sessionCallback({
        session: currentSession as never,
        token,
        user: authorizedUser as never,
        newSession: undefined,
        trigger: "update",
      })) as NonNullable<typeof mockSession> & { expires: string };
      mockSession = currentSession;

      // Step 6: Navigating to "/" now redirects cleanly to /hi/student/dashboard (NO redirect loop!)
      mockRedirect.mockClear();
      await expect(
        Home({ params: Promise.resolve({ locale: "hi" }) })
      ).rejects.toThrow("NEXT_REDIRECT: /hi/student/dashboard");

      // Step 7: requireStudent() now succeeds and returns the student context without redirecting
      mockRedirect.mockClear();
      const guarded = await requireStudent();
      expect(guarded.student.studentId).toBe("stu-loop");
      expect(guarded.student.admissionNo).toBe("0142");
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("4. Role Isolation & Existing-Session Switch Cut-off", () => {
    it("blocks a signed-in STUDENT from /admin and /teacher via requireRole", async () => {
      mockSession = {
        user: {
          id: "usr-stu-1",
          role: "STUDENT",
          mustChangePassword: false,
        },
      };

      await expect(requireRole(["ADMIN"])).rejects.toThrow(
        "NEXT_REDIRECT: /unauthorized"
      );
      await expect(requireRole(["TEACHER"])).rejects.toThrow(
        "NEXT_REDIRECT: /unauthorized"
      );
    });

    it("blocks an already-signed-in student in requireStudent() when studentPortalEnabled is turned off", async () => {
      mockSession = {
        user: {
          id: "usr-stu-1",
          role: "STUDENT",
          mustChangePassword: false,
        },
      };
      mockStudentsByUserId.set("usr-stu-1", {
        id: "stu-1",
        userId: "usr-stu-1",
        admissionNo: "0142",
        fullName: "Aarav Verma",
        isActive: true,
        sectionId: "sec-5a",
        section: null,
      });

      // Initially enabled
      mockPortalEnabled = true;
      unstableCacheStore.clear();
      expect(await isStudentPortalEnabled()).toBe(true);
      const okResult = await requireStudent();
      expect(okResult.student.studentId).toBe("stu-1");

      // Admin turns off switch and invalidates cache
      mockPortalEnabled = false;
      unstableCacheStore.clear();
      expect(await isStudentPortalEnabled()).toBe(false);

      await expect(requireStudent()).rejects.toThrow("NEXT_REDIRECT: /login");
    });
  });
});
