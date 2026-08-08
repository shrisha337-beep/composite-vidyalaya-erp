"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mailer";

/**
 * Admin resets a user's password.
 * Called from the student or teacher profile page.
 * The new password is temporary — the user should change it on next login.
 */
export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

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

  revalidatePath(`/admin/students`);
  revalidatePath(`/admin/teachers`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-SERVICE PASSWORD RESET (teachers / admins via email)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 1 — Teacher requests a password reset.
 * Finds their User by email, generates a UUID token, saves it (1 hr expiry),
 * and sends a reset link to their email address.
 */
export async function requestPasswordReset(
  email: string,
  locale: string,
  baseUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!email?.trim()) {
    return { success: false, message: "Please enter your email address." };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), isActive: true },
    include: {
      teacher: { select: { fullName: true } },
      adminProfile: { select: { fullName: true } },
    },
  });

  // Always return a success-like message to prevent email enumeration
  if (!user) {
    return {
      success: true,
      message: "If that email is registered, you will receive a reset link shortly.",
    };
  }

  // Invalidate any previous unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const recipientName =
    user.teacher?.fullName ?? user.adminProfile?.fullName ?? "User";

  const resetLink = `${baseUrl}/${locale}/reset-password?token=${token}`;

  await sendPasswordResetEmail({ toEmail: user.email!, resetLink, recipientName });

  return {
    success: true,
    message: "If that email is registered, you will receive a reset link shortly.",
  };
}

/**
 * Step 2 — Teacher submits their new password using the token from the email link.
 */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!token?.trim()) {
    return { success: false, message: "Invalid reset link." };
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) {
    return { success: false, message: "This reset link is invalid." };
  }
  if (record.usedAt) {
    return { success: false, message: "This reset link has already been used." };
  }
  if (record.expiresAt < new Date()) {
    return { success: false, message: "This reset link has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true, message: "Password updated successfully. You can now log in." };
}
