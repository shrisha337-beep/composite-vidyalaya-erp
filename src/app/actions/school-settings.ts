"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

// Read path lives in lib/data/school-settings.ts (cached, not a public action).
// Only the type is re-exported — re-exporting the function from this
// "use server" file would turn it back into a public POST endpoint.
export type { SchoolSettingsData } from "@/lib/data/school-settings";

/**
 * Updates School Settings.
 */
export async function updateSchoolSettingsAction(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);
  const locale = (formData.get("locale") as string) ?? "en";

  const schoolName = (formData.get("schoolName") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const udiseCode = (formData.get("udiseCode") as string)?.trim() || null;
  const schoolBlock = (formData.get("schoolBlock") as string)?.trim() || "Paraspur";
  const schoolDistrict = (formData.get("schoolDistrict") as string)?.trim() || "Gonda";
  const conversionCostPrimary = parseFloat(formData.get("conversionCostPrimary") as string) || 6.78;
  const conversionCostJunior = parseFloat(formData.get("conversionCostJunior") as string) || 10.17;
  const fruitCostPerStudent = parseFloat(formData.get("fruitCostPerStudent") as string) || 4.0;
  const nutritionCostPerStudent = parseFloat(formData.get("nutritionCostPerStudent") as string) || 5.0;

  // Parse menu options from comma-separated strings
  const riceMenuRaw = (formData.get("riceMenuOptions") as string)?.trim() || "";
  const wheatMenuRaw = (formData.get("wheatMenuOptions") as string)?.trim() || "";
  const riceMenuOptions = riceMenuRaw ? riceMenuRaw.split(",").map(s => s.trim()).filter(Boolean) : ["Dal-Chawal", "Sabzi-Chawal", "Tehri"];
  const wheatMenuOptions = wheatMenuRaw ? wheatMenuRaw.split(",").map(s => s.trim()).filter(Boolean) : ["Sabzi-Roti"];

  if (!schoolName) {
    return { success: false, message: "School name is required." };
  }

  // Handle logo uploads
  const sarvaLogoFile = formData.get("logoSarvaShiksha") as File | null;
  const samagraLogoFile = formData.get("logoSamagra") as File | null;

  let logoUrlSarvaShiksha: string | undefined = undefined;
  let logoUrlSamagra: string | undefined = undefined;

  if (sarvaLogoFile && sarvaLogoFile.size > 0) {
    try {
      const ext = sarvaLogoFile.name.split(".").pop() ?? "jpg";
      const blob = await put(`school/sarva-shiksha-logo.${ext}`, sarvaLogoFile, {
        access: "public",
      });
      logoUrlSarvaShiksha = blob.url;
    } catch (e) {
      console.error("Failed to upload Sarva Shiksha logo", e);
    }
  }

  if (samagraLogoFile && samagraLogoFile.size > 0) {
    try {
      const ext = samagraLogoFile.name.split(".").pop() ?? "png";
      const blob = await put(`school/samagra-shiksha-logo.${ext}`, samagraLogoFile, {
        access: "public",
      });
      logoUrlSamagra = blob.url;
    } catch (e) {
      console.error("Failed to upload Samagra logo", e);
    }
  }

  try {
    await prisma.schoolSettings.upsert({
      where: { id: "singleton" },
      update: {
        schoolName,
        address,
        udiseCode,
        schoolBlock,
        schoolDistrict,
        conversionCostPrimary,
        conversionCostJunior,
        fruitCostPerStudent,
        nutritionCostPerStudent,
        riceMenuOptions,
        wheatMenuOptions,
        ...(logoUrlSarvaShiksha ? { logoUrlSarvaShiksha } : {}),
        ...(logoUrlSamagra ? { logoUrlSamagra } : {}),
      },
      create: {
        id: "singleton",
        schoolName,
        address,
        udiseCode,
        schoolBlock,
        schoolDistrict,
        conversionCostPrimary,
        conversionCostJunior,
        fruitCostPerStudent,
        nutritionCostPerStudent,
        riceMenuOptions,
        wheatMenuOptions,
        logoUrlSarvaShiksha: logoUrlSarvaShiksha ?? "/images/logo-sarva-shiksha.jpg",
        logoUrlSamagra: logoUrlSamagra ?? "/images/logo-samagra-shiksha.png",
        defaultLocale: "hi",
      },
    });

    revalidatePath(`/${locale}/admin/settings`);
    revalidatePath(`/${locale}/admin`);
    return { success: true, message: "School settings successfully saved." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update school settings.",
    };
  }
}
