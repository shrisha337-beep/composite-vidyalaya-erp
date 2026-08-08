"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Creates one AcademicSession + Classes 1–8, each with one Section
 * (transparent to the user — UI only ever shows class numbers).
 */
export async function setupAcademicSession(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const label = (formData.get("label") as string)?.trim();
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!label || !startDate || !endDate) {
    redirect(`/en/admin/classes?error=${encodeURIComponent("All fields are required.")}`);
  }

  // Check duplicate
  const existing = await prisma.academicSession.findUnique({ where: { label } });
  if (existing) {
    redirect(`/en/admin/classes?error=${encodeURIComponent(`Session "${label}" already exists.`)}`);
  }

  await prisma.$transaction(async (tx) => {
    // Mark all existing sessions as not current
    await tx.academicSession.updateMany({ data: { isCurrent: false } });

    const session = await tx.academicSession.create({
      data: {
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: true,
      },
    });

    // Create Classes 1–8, each with one hidden Section
    for (let i = 1; i <= 8; i++) {
      const cls = await tx.class.create({
        data: { name: String(i), sessionId: session.id },
      });
      // Section is an internal concept — name matches class, invisible in UI
      await tx.section.create({
        data: { name: String(i), classId: cls.id },
      });
    }
  });

  revalidatePath("/admin/classes");
}
