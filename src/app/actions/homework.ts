"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createHomework(formData: FormData): Promise<void> {
  const session = await requireRole(["TEACHER"]);
  const teacherUserId = session.user.id;

  const locale = (formData.get("locale") as string) ?? "en";
  const subjectId = (formData.get("subjectId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const dueDateRaw = (formData.get("dueDate") as string)?.trim();

  if (!subjectId || !title || !dueDateRaw) {
    redirect(
      `/${locale}/teacher/homework?error=${encodeURIComponent(
        "Subject, Title, and Due Date are required."
      )}`
    );
  }

  const dueDate = new Date(dueDateRaw);
  if (isNaN(dueDate.getTime())) {
    redirect(
      `/${locale}/teacher/homework?error=${encodeURIComponent(
        "Invalid due date selected."
      )}`
    );
  }

  // Handle optional attachment upload
  let fileUrl: string | null = null;
  const attachmentFile = formData.get("attachment") as File | null;
  if (attachmentFile && attachmentFile.size > 0) {
    try {
      const blob = await put(`homework/${Date.now()}_${attachmentFile.name}`, attachmentFile, {
        access: "public",
      });
      fileUrl = blob.url;
    } catch (e) {
      // ignore attachment failure and create homework anyway
    }
  }

  await prisma.homework.create({
    data: {
      subjectId,
      title,
      description,
      fileUrl,
      dueDate,
      assignedById: teacherUserId,
    },
  });

  revalidatePath(`/${locale}/teacher/homework`);
  revalidatePath(`/${locale}/student/homework`);
  redirect(`/${locale}/teacher/homework`);
}

export async function deleteHomeworkAction({
  homeworkId,
  locale,
}: {
  homeworkId: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["TEACHER"]);
  const teacherUserId = session.user.id;

  try {
    const hw = await prisma.homework.findUnique({
      where: { id: homeworkId },
      select: { assignedById: true },
    });

    if (!hw || hw.assignedById !== teacherUserId) {
      return { success: false, message: "Permission denied or homework not found." };
    }

    await prisma.homework.delete({
      where: { id: homeworkId },
    });

    revalidatePath(`/${locale}/teacher/homework`);
    return { success: true, message: "Homework assignment successfully deleted." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete homework.",
    };
  }
}
