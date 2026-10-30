"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Admin resets a teacher's password.
 * Called from the teacher detail page in the admin panel.
 * The new password is temporary — the teacher should change it on next login.
 */
export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  if (isDemoMode()) {
    throw new Error("Password resets are disabled in the demo environment.");
  }

  const userId = (formData.get("userId") as string)?.trim();
  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!userId || !newPassword || !confirmPassword) {
    throw new Error("All fields are required.");
  }

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new Error("User not found or inactive.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  revalidatePath(`/admin/teachers`);
}
