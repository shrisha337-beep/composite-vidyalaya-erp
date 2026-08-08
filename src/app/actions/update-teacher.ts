"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function updateTeacher(formData: FormData): Promise<{ success: boolean; message: string }> {
  await requireRole(["ADMIN"]);

  const locale = (formData.get("locale") as string) ?? "en";
  const teacherId = (formData.get("teacherId") as string)?.trim();
  const userId = (formData.get("userId") as string)?.trim();

  const fullName = (formData.get("fullName") as string)?.trim();
  const employeeCode = (formData.get("employeeCode") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const designation = (formData.get("designation") as string)?.trim() || null;
  const qualification = (formData.get("qualification") as string)?.trim() || null;
  const dateOfJoiningRaw = (formData.get("dateOfJoining") as string)?.trim();
  const classAssignment = (formData.get("classAssignment") as string)?.trim(); // e.g. "3" or ""

  if (!teacherId || !userId || !fullName || !employeeCode || !phone) {
    return { success: false, message: "Missing required fields." };
  }

  // 1. Verify unique employee code against other teachers
  const existingTeacher = await prisma.teacher.findFirst({
    where: { employeeCode, NOT: { id: teacherId } },
    select: { id: true },
  });
  if (existingTeacher) {
    return { success: false, message: "Employee code is already taken." };
  }

  // 2. Verify unique phone number against other users
  const existingUser = await prisma.user.findFirst({
    where: { phone, NOT: { id: userId } },
    select: { id: true },
  });
  if (existingUser) {
    return { success: false, message: "Mobile number is already registered to another user." };
  }

  // Handle optional new photo upload
  let photoUrl: string | null = null;
  const photoFile = formData.get("teacherPhoto") as File | null;
  if (photoFile && photoFile.size > 0) {
    try {
      const blob = await put(`teachers/${employeeCode}_photo`, photoFile, {
        access: "public",
      });
      photoUrl = blob.url;
    } catch (e) {
      // ignore failures and fall back to keeping old one
    }
  }

  const dateOfJoining = dateOfJoiningRaw ? new Date(dateOfJoiningRaw) : null;

  try {
    await prisma.$transaction(async (tx) => {
      // 3. Update User credential record
      await tx.user.update({
        where: { id: userId },
        data: { phone },
      });

      // 4. Update Teacher profile
      await tx.teacher.update({
        where: { id: teacherId },
        data: {
          fullName,
          employeeCode,
          designation,
          qualification,
          dateOfJoining,
          ...(photoUrl ? { photoUrl } : {}),
        },
      });

      // 5. Update Class Teacher assignment
      // First, clear this teacher from all sections in the database
      await tx.section.updateMany({
        where: { classTeacherId: teacherId },
        data: { classTeacherId: null },
      });

      if (classAssignment) {
        const currentSession = await tx.academicSession.findFirst({
          where: { isCurrent: true },
          select: { id: true },
        });

        if (currentSession) {
          const section = await tx.section.findFirst({
            where: {
              name: "A",
              class: {
                name: classAssignment,
                sessionId: currentSession.id,
              },
            },
            select: { id: true },
          });

          if (section) {
            // Assign this teacher as class teacher of the target section
            await tx.section.update({
              where: { id: section.id },
              data: { classTeacherId: teacherId },
            });
          }
        }
      }
    });

    revalidatePath(`/${locale}/admin/teachers`);
    revalidatePath(`/${locale}/admin/teachers/${teacherId}`);
    return { success: true, message: "Teacher profile successfully updated." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "An error occurred while updating the teacher profile.",
    };
  }
}
