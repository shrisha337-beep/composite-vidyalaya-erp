"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function toggleTeacherStatusAction({
  userId,
  isActive,
  locale,
  teacherId,
}: {
  userId: string;
  isActive: boolean;
  locale: string;
  teacherId: string;
}): Promise<{ success: boolean; message: string }> {
  await requireRole(["ADMIN"]);

  if (!userId || !teacherId) {
    return { success: false, message: "Missing required identifiers." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath(`/${locale}/admin/teachers`);
    revalidatePath(`/${locale}/admin/teachers/${teacherId}`);

    return {
      success: true,
      message: `Teacher account successfully ${isActive ? "activated" : "deactivated"}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to toggle status.",
    };
  }
}
