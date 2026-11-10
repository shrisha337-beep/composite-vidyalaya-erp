"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";
import { generateInitialStudentPassword } from "@/lib/student-credentials";

export type CredentialIssueMode = "missing" | "all";

export interface StudentCredentialSlip {
  admissionNo: string;
  fullName: string;
  className: string;
  initialPassword: string;
}

export interface IssueClassCredentialsResult {
  ok: boolean;
  error?: string;
  className?: string;
  mode?: CredentialIssueMode;
  issuedAt?: string;
  slips?: StudentCredentialSlip[];
}

export interface ResetStudentPasswordResult {
  ok: boolean;
  error?: string;
  admissionNo?: string;
  fullName?: string;
  initialPassword?: string;
}

export interface UnlockStudentAccountResult {
  ok: boolean;
  error?: string;
}

/**
 * Generates and issues one-time initial credentials for active students in a class.
 * - mode = "missing" (default): issues only to active students with `credentialsIssuedAt = null`.
 * - mode = "all": re-issues to all active students in the class, invalidating earlier slips
 *   and personal passwords for that class.
 *
 * Plaintext passwords are returned ONCE to the caller in memory, never stored or logged.
 */
export async function issueClassCredentialsAction(
  classId: string,
  mode: CredentialIssueMode = "missing"
): Promise<IssueClassCredentialsResult> {
  const session = await requireRole(["ADMIN"]);

  if (isDemoMode()) {
    return {
      ok: false,
      error: "Credential issuance is disabled in the demo environment.",
    };
  }

  const trimmedClassId = classId?.trim();
  if (!trimmedClassId) {
    return { ok: false, error: "Class ID is required." };
  }

  if (mode !== "missing" && mode !== "all") {
    return { ok: false, error: "Invalid issuance mode." };
  }

  const cls = await prisma.class.findUnique({
    where: { id: trimmedClassId },
    select: {
      id: true,
      name: true,
      sections: {
        select: {
          students: {
            where: {
              isActive: true,
              user: {
                isActive: true,
                role: "STUDENT",
                ...(mode === "missing" ? { credentialsIssuedAt: null } : {}),
              },
            },
            select: {
              id: true,
              userId: true,
              admissionNo: true,
              fullName: true,
              user: {
                select: {
                  credentialsIssuedAt: true,
                },
              },
            },
            orderBy: [{ admissionNo: "asc" }],
          },
        },
      },
    },
  });

  if (!cls) {
    return { ok: false, error: "Class not found." };
  }

  const targetStudents = cls.sections.flatMap((sec) => sec.students);
  if (targetStudents.length === 0) {
    return {
      ok: false,
      error:
        mode === "missing"
          ? `All active students in Class ${cls.name} already have issued credentials.`
          : `No active students found in Class ${cls.name}.`,
    };
  }

  // Hash sequentially in memory before opening the DB transaction so connection
  // time is minimal (~40 students * ~70ms = ~2.8s).
  const prepared: {
    userId: string;
    wasAlreadyIssued: boolean;
    passwordHash: string;
    slip: StudentCredentialSlip;
  }[] = [];

  for (const stu of targetStudents) {
    const initialPassword = generateInitialStudentPassword();
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    prepared.push({
      userId: stu.userId,
      wasAlreadyIssued: stu.user.credentialsIssuedAt !== null,
      passwordHash,
      slip: {
        admissionNo: stu.admissionNo,
        fullName: stu.fullName,
        className: cls.name,
        initialPassword,
      },
    });
  }

  const now = new Date();
  const reissuedCount = prepared.filter((p) => p.wasAlreadyIssued).length;

  await prisma.$transaction(
    async (tx) => {
      for (const item of prepared) {
        await tx.user.update({
          where: { id: item.userId },
          data: {
            passwordHash: item.passwordHash,
            mustChangePassword: true,
            credentialsIssuedAt: now,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "STUDENT_CREDENTIALS_ISSUE_CLASS",
          entityType: "Class",
          entityId: cls.id,
          metadata: {
            className: cls.name,
            mode,
            issuedCount: prepared.length,
            reissuedCount,
          },
        },
      });
    },
    { timeout: 15000 }
  );

  revalidatePath("/hi/admin/students/credentials");
  revalidatePath("/en/admin/students/credentials");

  return {
    ok: true,
    className: cls.name,
    mode,
    issuedAt: now.toISOString(),
    slips: prepared.map((p) => p.slip),
  };
}

/**
 * Resets a single student's portal password, generating a new one-time 8-character
 * password, setting `mustChangePassword = true` and `credentialsIssuedAt = now`,
 * clearing lockout state, and recording an AuditLog row.
 */
export async function resetStudentPasswordAction(
  studentId: string
): Promise<ResetStudentPasswordResult> {
  const session = await requireRole(["ADMIN"]);

  if (isDemoMode()) {
    return {
      ok: false,
      error: "Password resets are disabled in the demo environment.",
    };
  }

  const trimmedId = studentId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "Student ID is required." };
  }

  const student = await prisma.student.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      userId: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !student ||
    !student.isActive ||
    !student.user ||
    !student.user.isActive ||
    student.user.role !== "STUDENT"
  ) {
    return { ok: false, error: "Active student account not found." };
  }

  const initialPassword = generateInitialStudentPassword();
  const passwordHash = await bcrypt.hash(initialPassword, 10);
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          credentialsIssuedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "STUDENT_PASSWORD_RESET",
          entityType: "Student",
          entityId: student.id,
          metadata: {
            admissionNo: student.admissionNo,
            targetUserId: student.userId,
          },
        },
      });
    },
    { timeout: 10000 }
  );

  revalidatePath(`/hi/admin/students/${student.id}`);
  revalidatePath(`/en/admin/students/${student.id}`);
  revalidatePath("/hi/admin/students/credentials");
  revalidatePath("/en/admin/students/credentials");

  return {
    ok: true,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    initialPassword,
  };
}

/**
 * Unlocks a locked student account by clearing `failedLoginAttempts` and `lockedUntil`,
 * and records an AuditLog row.
 */
export async function unlockStudentAccountAction(
  studentId: string
): Promise<UnlockStudentAccountResult> {
  const session = await requireRole(["ADMIN"]);

  if (isDemoMode()) {
    return {
      ok: false,
      error: "Account unlock is disabled in the demo environment.",
    };
  }

  const trimmedId = studentId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "Student ID is required." };
  }

  const student = await prisma.student.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      userId: true,
      admissionNo: true,
      isActive: true,
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !student ||
    !student.isActive ||
    !student.user ||
    !student.user.isActive ||
    student.user.role !== "STUDENT"
  ) {
    return { ok: false, error: "Active student account not found." };
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "STUDENT_ACCOUNT_UNLOCK",
          entityType: "Student",
          entityId: student.id,
          metadata: {
            admissionNo: student.admissionNo,
            targetUserId: student.userId,
          },
        },
      });
    },
    { timeout: 10000 }
  );

  revalidatePath(`/hi/admin/students/${student.id}`);
  revalidatePath(`/en/admin/students/${student.id}`);

  return { ok: true };
}

