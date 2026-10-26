import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SchoolSettings } from "@/generated/prisma/client";
import { getSchoolBranding } from "@/lib/branding";

export interface SchoolSettingsData {
  id: string;
  schoolName: string;
  address: string | null;
  udiseCode: string | null;
  schoolBlock: string | null;
  schoolDistrict: string | null;
  logoUrlSarvaShiksha: string | null;
  logoUrlSamagra: string | null;
  defaultLocale: string;
  conversionCostPrimary: number;
  conversionCostJunior: number;
  fruitCostPerStudent: number;
  nutritionCostPerStudent: number;
  riceMenuOptions: string[];
  wheatMenuOptions: string[];
}

export const DEFAULT_SETTINGS = {
  id: "singleton",
  schoolName: "Composite School Chandpur Tarhar",
  address:
    "Composite School Chandpur Tarhar\nBlock - Paraspur, Tehsil - Colonel Ganj\nJanpad - Gonda",
  udiseCode: "09530607202",
  schoolBlock: "Paraspur",
  schoolDistrict: "Gonda",
  logoUrlSarvaShiksha: "/images/logo-sarva-shiksha.jpg",
  logoUrlSamagra: "/images/logo-samagra-shiksha.png",
  defaultLocale: "hi",
  conversionCostPrimary: 6.78,
  conversionCostJunior: 10.17,
  fruitCostPerStudent: 4.0,
  nutritionCostPerStudent: 5.0,
  riceMenuOptions: ["Dal-Chawal", "Sabzi-Chawal", "Tehri"],
  wheatMenuOptions: ["Sabzi-Roti"],
};

// Old placeholder names that should be displayed as the official name.
const LEGACY_SCHOOL_NAMES = new Set([
  "Composite Vidyalaya Chandpur Tarhar",
  "Composite Vidyalaya Chandpur Tarahar",
]);

type SettingsRow = SchoolSettings;

function toSettingsData(row: SettingsRow): SchoolSettingsData {
  const branding = getSchoolBranding();

  if (branding.isDemo) {
    return {
      id: row.id,
      schoolName: branding.schoolNameEnglish,
      address: `${branding.schoolNameEnglish}\nBlock - ${branding.schoolBlock}\nJanpad - ${branding.schoolDistrict}`,
      udiseCode: branding.udiseCode,
      schoolBlock: branding.schoolBlock,
      schoolDistrict: branding.schoolDistrict,
      logoUrlSarvaShiksha: null,
      logoUrlSamagra: null,
      defaultLocale: row.defaultLocale,
      conversionCostPrimary: row.conversionCostPrimary,
      conversionCostJunior: row.conversionCostJunior,
      fruitCostPerStudent: row.fruitCostPerStudent,
      nutritionCostPerStudent: row.nutritionCostPerStudent,
      riceMenuOptions: row.riceMenuOptions,
      wheatMenuOptions: row.wheatMenuOptions,
    };
  }

  return {
    id: row.id,
    schoolName: LEGACY_SCHOOL_NAMES.has(row.schoolName)
      ? DEFAULT_SETTINGS.schoolName
      : row.schoolName,
    address: row.address,
    udiseCode: row.udiseCode || DEFAULT_SETTINGS.udiseCode,
    schoolBlock: row.schoolBlock || DEFAULT_SETTINGS.schoolBlock,
    schoolDistrict: row.schoolDistrict || DEFAULT_SETTINGS.schoolDistrict,
    logoUrlSarvaShiksha: row.logoUrlSarvaShiksha,
    logoUrlSamagra: row.logoUrlSamagra,
    defaultLocale: row.defaultLocale,
    conversionCostPrimary: row.conversionCostPrimary,
    conversionCostJunior: row.conversionCostJunior,
    fruitCostPerStudent: row.fruitCostPerStudent,
    nutritionCostPerStudent: row.nutritionCostPerStudent,
    riceMenuOptions: row.riceMenuOptions,
    wheatMenuOptions: row.wheatMenuOptions,
  };
}

/**
 * Retrieves the singleton SchoolSettings record, seeding defaults on first use.
 *
 * Moved out of the "use server" actions file: anything exported from a
 * "use server" module becomes a publicly POST-able endpoint, and this is a
 * read helper (that could also write a row) with no auth check — it never
 * needed to be an action. React cache() dedupes calls within one request.
 */
export const getSchoolSettings = cache(async (): Promise<SchoolSettingsData> => {
  const existing = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
  });
  if (existing) return toSettingsData(existing);

  // upsert (not create) so two concurrent first requests can't collide on the PK.
  const created = await prisma.schoolSettings.upsert({
    where: { id: "singleton" },
    create: DEFAULT_SETTINGS,
    update: {},
  });
  return toSettingsData(created);
});
