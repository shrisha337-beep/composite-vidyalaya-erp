"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export interface SaveMdmItemSelectionInput {
  dateString: string;
  rice: boolean;
  wheat: boolean;
  fruits: boolean;
  nutrition: boolean;
  milk: boolean;
  riceMenu: string | null;
  wheatMenu: string | null;
  locale?: string;
}

/**
 * Save or update the MDM daily item selection for a given date.
 * This determines which columns (rice, wheat, fruits, nutrition, milk)
 * are active for that day's MDM calculation.
 */
export async function saveMdmItemSelectionAction(
  input: SaveMdmItemSelectionInput
): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);

  if (!input.dateString) {
    return { success: false, message: "Missing date parameter." };
  }

  const logDate = new Date(input.dateString);
  if (isNaN(logDate.getTime())) {
    return { success: false, message: "Invalid date provided." };
  }
  logDate.setHours(0, 0, 0, 0);

  try {
    await prisma.mDMDailyItemSelection.upsert({
      where: { date: logDate },
      create: {
        date: logDate,
        rice: input.rice,
        wheat: input.wheat,
        fruits: input.fruits,
        nutrition: input.nutrition,
        milk: input.milk,
        riceMenu: input.riceMenu || null,
        wheatMenu: input.wheatMenu || null,
        updatedById: session.user.id,
      },
      update: {
        rice: input.rice,
        wheat: input.wheat,
        fruits: input.fruits,
        nutrition: input.nutrition,
        milk: input.milk,
        riceMenu: input.riceMenu || null,
        wheatMenu: input.wheatMenu || null,
        updatedById: session.user.id,
      },
    });

    const locale = input.locale || "en";
    revalidatePath(`/${locale}/admin/mdm`);

    return {
      success: true,
      message: "MDM item selection saved for this day.",
    };
  } catch (error) {
    console.error("Error saving MDM item selection:", error);
    return {
      success: false,
      message: "Failed to save MDM item selection.",
    };
  }
}
