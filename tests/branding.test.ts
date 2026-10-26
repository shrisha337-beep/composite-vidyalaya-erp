import { describe, it, expect, afterEach } from "vitest";
import { getSchoolBranding } from "@/lib/branding";
import fs from "fs";
import path from "path";

/**
 * 16 prohibited real-school strings to detect across the repository.
 */
const TARGET_STRINGS = [
  "Chandpur",
  "Tarhar",
  "Tarahar",
  "चांदपुर",
  "तरहर",
  "परसपुर",
  "परासपुर",
  "Paraspur",
  "Gonda",
  "गोंडा",
  "कर्नलगंज",
  "09530607202",
  "Government of Uttar Pradesh",
  "Basic Education",
  "Basic Shiksha",
  "Official Administrative Portal",
  "आधिकारिक प्रशासनिक पोर्टल",
];

/**
 * Explicit allowlist of files under src/ permitted to contain real-school strings.
 *
 * Documented rationale for each entry:
 *
 * 1. "src/lib/branding.ts":
 *    The single source of truth for institution identity. Holds the authentic
 *    non-demo fallback values for the production school alongside the anonymised
 *    demo defaults.
 *
 * 2. "src/lib/data/school-settings.ts":
 *    Contains DEFAULT_SETTINGS and LEGACY_SCHOOL_NAMES representing the production
 *    school's baseline database configuration and legacy schema fallback when DEMO_MODE
 *    is unset/false.
 *
 * 3. "src/i18n/messages/en.json":
 *    Static localization dictionary entry for the real school's name in English
 *    fallback messages.
 *
 * 4. "src/i18n/messages/hi.json":
 *    Static localization dictionary entry for the real school's name in Hindi
 *    fallback messages.
 *
 * 5. "src/lib/mdm-engine.ts":
 *    Code comment citing statutory state guidelines ("Uttar Pradesh Basic Shiksha Parishad
 *    statutory rules").
 */
const SRC_ALLOWLIST = new Set([
  "src/lib/branding.ts",
  "src/lib/data/school-settings.ts",
  "src/i18n/messages/en.json",
  "src/i18n/messages/hi.json",
  "src/lib/mdm-engine.ts",
]);

function walkDirectory(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "generated") {
        walkDirectory(fullPath, fileList);
      }
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Institution Branding Isolation", () => {
  const originalDemoMode = process.env.DEMO_MODE;

  afterEach(() => {
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
  });

  describe("Static scan: No forbidden strings in src/ outside allowlist", () => {
    it("ensures none of the 16 real-school strings appear in src/ outside branding.ts and allowlist", () => {
      const srcDir = path.resolve(process.cwd(), "src");
      const files = walkDirectory(srcDir);
      const violations: { file: string; line: number; term: string; snippet: string }[] = [];

      for (const filePath of files) {
        const relativePath = path
          .relative(process.cwd(), filePath)
          .replace(/\\/g, "/");

        if (SRC_ALLOWLIST.has(relativePath)) {
          // "आधिकारिक प्रशासनिक पोर्टल" is strictly permitted ONLY in src/lib/branding.ts
          if (relativePath !== "src/lib/branding.ts") {
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((lineText, idx) => {
              if (lineText.includes("आधिकारिक प्रशासनिक पोर्टल")) {
                violations.push({
                  file: relativePath,
                  line: idx + 1,
                  term: "आधिकारिक प्रशासनिक पोर्टल",
                  snippet: lineText.trim(),
                });
              }
            });
          }
          continue;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        lines.forEach((lineText, idx) => {
          for (const term of TARGET_STRINGS) {
            if (lineText.includes(term)) {
              violations.push({
                file: relativePath,
                line: idx + 1,
                term,
                snippet: lineText.trim(),
              });
            }
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  describe("Demo mode active (DEMO_MODE = 'true' or override)", () => {
    it("returns zero prohibited real-school strings in any field returned by getSchoolBranding(true)", () => {
      const branding = getSchoolBranding(true);
      const stringValues = Object.values(branding).filter(
        (v): v is string => typeof v === "string"
      );

      for (const val of stringValues) {
        for (const target of TARGET_STRINGS) {
          expect(val).not.toContain(target);
        }
      }
    });

    it("returns zero prohibited real-school strings when process.env.DEMO_MODE is 'true'", () => {
      process.env.DEMO_MODE = "true";
      const branding = getSchoolBranding();
      const stringValues = Object.values(branding).filter(
        (v): v is string => typeof v === "string"
      );

      for (const val of stringValues) {
        for (const target of TARGET_STRINGS) {
          expect(val).not.toContain(target);
        }
      }

      expect(branding.isDemo).toBe(true);
      expect(branding.showGovtMarks).toBe(false);
      expect(branding.sampleVillage).toBe("Shantinagar");
      expect(branding.schoolNameEnglish).toBe("Demo Composite School");
      expect(branding.schoolNameHindi).toBe("डेमो कम्पोजिट विद्यालय");
      expect(branding.schoolNameCombined).toBe(
        "डेमो कम्पोजिट विद्यालय (Demo Composite School)"
      );
      expect(branding.schoolTitleLine1).toBe("Demo Composite School");
      expect(branding.schoolTitleLine2).toBe("");
      expect(branding.udiseCode).toBe("09000000000");
      expect(branding.schoolBlock).toBe("Demo Block");
      expect(branding.schoolBlockHindi).toBe("डेमो ब्लॉक");
      expect(branding.schoolDistrict).toBe("Demo District");
      expect(branding.schoolDistrictHindi).toBe("डेमो जनपद");
      expect(branding.location).toBe("Demo School");
      expect(branding.governanceLine).toBe(
        "School Education System · Academic Administration"
      );
      expect(branding.governanceShort).toBe("Demo School Management Portal");
      expect(branding.portalSubtitle).toBe("Demo School Management Portal");
      expect(branding.portalSubtitleHindi).toBe("डेमो स्कूल प्रबंधन पोर्टल");
      expect(branding.portalCategory).toBe("Demo School Management Portal");
      expect(branding.systemTag).toBe("Demo Academic System");
      expect(branding.tcAddressMeta).toBe("ब्लॉक - डेमो ब्लॉक, जनपद - डेमो जनपद");
      expect(branding.loginMobileSubtitle).toBe("Demo School · डेमो कम्पोजिट विद्यालय");
      expect(branding.metaTitle).toBe("Demo Composite School - ERP");
      expect(branding.metaUrl).toBe("");
    });
  });

  describe("Non-demo mode (DEMO_MODE unset or 'false')", () => {
    it("returns exact byte-for-byte real school branding when DEMO_MODE is unset", () => {
      delete process.env.DEMO_MODE;
      const branding = getSchoolBranding();

      expect(branding.isDemo).toBe(false);
      expect(branding.showGovtMarks).toBe(true);
      expect(branding.sampleVillage).toBe("Chandpur");
      expect(branding.schoolNameEnglish).toBe("Composite School Chandpur Tarhar");
      expect(branding.schoolNameHindi).toBe("कम्पोजिट विद्यालय चांदपुर तरहर");
      expect(branding.schoolNameCombined).toBe(
        "कम्पोजिट विद्यालय चांदपुर तरहर (Composite Vidyalaya Chandpur Tarahar)"
      );
      expect(branding.schoolTitleLine1).toBe("Composite School");
      expect(branding.schoolTitleLine2).toBe("Chandpur Tarhar");
      expect(branding.udiseCode).toBe("09530607202");
      expect(branding.schoolBlock).toBe("Paraspur");
      expect(branding.schoolBlockHindi).toBe("परसपुर");
      expect(branding.schoolDistrict).toBe("Gonda");
      expect(branding.schoolDistrictHindi).toBe("गोंडा");
      expect(branding.location).toBe("Chandpur Tarhar");
      expect(branding.governanceLine).toBe(
        "Government of Uttar Pradesh · Basic Education Department"
      );
      expect(branding.governanceShort).toBe(
        "Govt. of Uttar Pradesh - Basic Education Dept."
      );
      expect(branding.portalSubtitle).toBe(
        "Official Administrative Portal for Teachers & Authorities"
      );
      expect(branding.portalSubtitleHindi).toBe("आधिकारिक प्रशासनिक पोर्टल");
      expect(branding.portalCategory).toBe("Government School Portal");
      expect(branding.systemTag).toBe("UP Basic Shiksha");
      expect(branding.tcAddressMeta).toBe(
        "ब्लॉक - परासपुर, तहसील - कर्नलगंज, जनपद - गोंडा"
      );
      expect(branding.loginMobileSubtitle).toBe(
        "Chandpur Tarhar · कम्पोजिट विद्यालय"
      );
      expect(branding.metaTitle).toBe("Composite School Chandpur Tarhar - ERP");
      expect(branding.metaDescription).toBe(
        "Government school ERP portal for Composite School Chandpur Tarhar. Manage students, attendance, marks, mid-day meals, and more."
      );
      expect(branding.metaUrl).toBe("");
    });

    it("returns exact byte-for-byte real school branding when DEMO_MODE is 'false'", () => {
      process.env.DEMO_MODE = "false";
      const branding = getSchoolBranding();

      expect(branding.isDemo).toBe(false);
      expect(branding.schoolNameEnglish).toBe("Composite School Chandpur Tarhar");
      expect(branding.udiseCode).toBe("09530607202");
      expect(branding.governanceLine).toBe(
        "Government of Uttar Pradesh · Basic Education Department"
      );
    });

    it("returns exact real branding when overrideDemo is false even if DEMO_MODE is 'true'", () => {
      process.env.DEMO_MODE = "true";
      const branding = getSchoolBranding(false);

      expect(branding.isDemo).toBe(false);
      expect(branding.schoolNameEnglish).toBe("Composite School Chandpur Tarhar");
      expect(branding.udiseCode).toBe("09530607202");
    });
  });
});
