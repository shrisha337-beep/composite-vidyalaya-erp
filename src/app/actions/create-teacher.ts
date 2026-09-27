"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTeacher(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const locale = (formData.get("locale") as string) ?? "en";
  const fullName = (formData.get("fullName") as string)?.trim();
  const employeeCode = (formData.get("employeeCode") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  const designation = (formData.get("designation") as string)?.trim() || null;
  const qualification = (formData.get("qualification") as string)?.trim() || null;
  const dateOfJoiningRaw = (formData.get("dateOfJoining") as string)?.trim();
  const classAssignment = (formData.get("classAssignment") as string)?.trim();
  const tempPassword = (formData.get("tempPassword") as string)?.trim();

  if (!fullName || !employeeCode || !phone || !tempPassword) {
    redirect(
      `/${locale}/admin/teachers/new?error=${encodeURIComponent(
        "Full Name, Employee Code, Mobile Number, and Temporary Password are required."
      )}`
    );
  }

  if (tempPassword.length < 8) {
    redirect(
      `/${locale}/admin/teachers/new?error=${encodeURIComponent(
        "Temporary password must be at least 8 characters."
      )}`
    );
  }

  // 1. Verify unique phone number
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  if (existingUser) {
    redirect(
      `/${locale}/admin/teachers/new?error=${encodeURIComponent(
        "A user with this mobile number already exists."
      )}`
    );
  }



  // 2. Verify unique employee code
  const existingTeacher = await prisma.teacher.findUnique({
    where: { employeeCode },
    select: { id: true },
  });
  if (existingTeacher) {
    redirect(
      `/${locale}/admin/teachers/new?error=${encodeURIComponent(
        "A teacher with this employee code already exists."
      )}`
    );
  }

  // Handle optional photo upload
  let photoUrl: string | null = null;
  const photoFile = formData.get("teacherPhoto") as File | null;
  if (photoFile && photoFile.size > 0) {
    try {
      const blob = await put(`teachers/${employeeCode}_photo`, photoFile, {
        access: "public",
      });
      photoUrl = blob.url;
    } catch (e) {
      // Allow creation even if upload fails
    }
  }

  const dateOfJoining = dateOfJoiningRaw ? new Date(dateOfJoiningRaw) : null;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // 3. Create User + Teacher in a single transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: "TEACHER",
        phone,
        passwordHash,
        isActive: true,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        employeeCode,
        fullName,
        designation,
        qualification,
        dateOfJoining,
        photoUrl,
      },
    });

    // Handle Class Teacher Assignment in the active session
    if (classAssignment) {
      const currentSession = await tx.academicSession.findFirst({
        where: { isCurrent: true },
        select: { id: true },
      });

      if (currentSession) {
        // Find section "A" of the selected class
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
          // Clear any existing class teacher for this section first
          await tx.section.updateMany({
            where: { classTeacherId: teacher.id },
            data: { classTeacherId: null },
          });

          // Set this teacher as class teacher
          await tx.section.update({
            where: { id: section.id },
            data: { classTeacherId: teacher.id },
          });
        }
      }
    }
  });

  revalidatePath(`/${locale}/admin/teachers`);
  redirect(`/${locale}/admin/teachers`);
}
