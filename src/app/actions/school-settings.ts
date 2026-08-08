"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export interface SchoolSettingsData {
  id: string;
  schoolName: string;
  address: string | null;
  udiseCode: string | null;
  logoUrlSarvaShiksha: string | null;
  logoUrlSamagra: string | null;
  defaultLocale: string;
}

const DEFAULT_SETTINGS = {
  id: "singleton",
  schoolName: "Composite Vidyalaya Chandpur Tarahar",
  address:
    "Composite Vidyalaya Chandpur Tarahar\nBlock - Paraspur, Tehsil - Colonel Ganj\nJanpad - Gonda",
  udiseCode: null,
  logoUrlSarvaShiksha: "/images/logo-sarva-shiksha.jpg",
  logoUrlSamagra: "/images/logo-samagra-shiksha.png",
  defaultLocale: "hi",
};

/**
 * Retrieves the singleton SchoolSettings record.
 * Creates/upserts default values if not present.
 */
export async function getSchoolSettings(): Promise<SchoolSettingsData> {
  const existing = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
  });

  if (existing) {
    return {
      id: existing.id,
      schoolName: existing.schoolName,
      address: existing.address,
      udiseCode: existing.udiseCode,
      logoUrlSarvaShiksha: existing.logoUrlSarvaShiksha,
      logoUrlSamagra: existing.logoUrlSamagra,
      defaultLocale: existing.defaultLocale,
    };
  }

  // Seed singleton record
  const created = await prisma.schoolSettings.create({
    data: DEFAULT_SETTINGS,
  });

  return {
    id: created.id,
    schoolName: created.schoolName,
    address: created.address,
    udiseCode: created.udiseCode,
    logoUrlSarvaShiksha: created.logoUrlSarvaShiksha,
    logoUrlSamagra: created.logoUrlSamagra,
    defaultLocale: created.defaultLocale,
  };
}

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
        ...(logoUrlSarvaShiksha ? { logoUrlSarvaShiksha } : {}),
        ...(logoUrlSamagra ? { logoUrlSamagra } : {}),
      },
      create: {
        id: "singleton",
        schoolName,
        address,
        udiseCode,
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
