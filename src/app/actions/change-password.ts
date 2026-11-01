"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-mode";
import { validateNewPassword } from "@/lib/student-credentials";

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
}

/**
 * Allows the currently signed-in user (STUDENT, TEACHER, or ADMIN) to change
 * their own password and clears `mustChangePassword` on their `User` row.
 */
export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangePasswordResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  if (isDemoMode()) {
    return { ok: false, error: "DEMO_MODE_DISABLED" };
  }

  const currentPassword = input.currentPassword ?? "";
  const newPassword = input.newPassword ?? "";
  const confirmPassword = input.confirmPassword ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "FIELDS_REQUIRED" };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "PASSWORDS_DO_NOT_MATCH" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      phone: true,
      passwordHash: true,
      isActive: true,
      student: {
        select: {
          admissionNo: true,
        },
      },
    },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  const matchesCurrent = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );
  if (!matchesCurrent) {
    return { ok: false, error: "INVALID_CURRENT_PASSWORD" };
  }

  const policyError = validateNewPassword(newPassword, {
    admissionNo: user.student?.admissionNo ?? null,
    phone: user.phone,
    currentPassword,
  });
  if (policyError) {
    return { ok: false, error: policyError };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return { ok: true };
}

