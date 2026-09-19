"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

/**
 * Checks which of classes 1–8 are missing in the current academic session
 * and creates the missing Class + Section records.
 */
export async function repairSession(): Promise<{
  success: boolean;
  message: string;
  repaired: string[];
}> {
  await requireRole(["ADMIN"]);

  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: { select: { name: true } },
    },
  });

  if (!session) {
    return {
      success: false,
      message: "No active academic session found.",
      repaired: [],
    };
  }

  const existingClassNames = new Set(session.classes.map((c) => c.name));
  const allClassNames = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const missing = allClassNames.filter((n) => !existingClassNames.has(n));

  if (missing.length === 0) {
    return {
      success: true,
      message: "All classes 1–8 are present. Nothing to repair.",
      repaired: [],
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const name of missing) {
      const cls = await tx.class.create({
        data: { name, sessionId: session.id },
      });
      await tx.section.create({
        data: { name, classId: cls.id },
      });
    }
  });

  revalidatePath("/admin/classes");

  return {
    success: true,
    message: `Repaired ${missing.length} missing class(es): ${missing.map((n) => `Class ${n}`).join(", ")}.`,
    repaired: missing,
  };
}
