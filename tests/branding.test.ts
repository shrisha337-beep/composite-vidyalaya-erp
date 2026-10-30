import { describe, it, expect, afterEach } from "vitest";
import { getSchoolBranding } from "@/lib/branding";

describe("Branding Helper - Institution Identity Isolation", () => {
  const originalDemoMode = process.env.DEMO_MODE;

  afterEach(() => {
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
  });

  describe("Demo mode active (DEMO_MODE = 'true' or override)", () => {
    it("returns fictional institution values when DEMO_MODE is 'true'", () => {
      process.env.DEMO_MODE = "true";
      const branding = getSchoolBranding();

      expect(branding.isDemo).toBe(true);
      expect(branding.schoolNameEnglish).toBe("Demo Composite School");
      expect(branding.schoolNameHindi).toBe("डेमो कम्पोजिट विद्यालय");
      expect(branding.schoolNameCombined).toBe(
        "डेमो कम्पोजिट विद्यालय (Demo Composite School)"
      );
      expect(branding.udiseCode).toBe("09000000000");
      expect(branding.schoolBlock).toBe("Demo Block");
      expect(branding.schoolDistrict).toBe("Demo District");
      expect(branding.location).toBe("Demo School");
      expect(branding.governanceShort).toBe("Demo School Management Portal");
      expect(branding.portalSubtitle).toBe("Demo School Management Portal");
      expect(branding.portalSubtitleHindi).toBe("डेमो स्कूल प्रबंधन पोर्टल");
      expect(branding.portalCategory).toBe("Demo School Management Portal");
      expect(branding.metaUrl).toBe("");
    });

    it("returns fictional institution values when overrideDemo is true", () => {
      delete process.env.DEMO_MODE;
      const branding = getSchoolBranding(true);

      expect(branding.isDemo).toBe(true);
      expect(branding.schoolNameEnglish).toBe("Demo Composite School");
      expect(branding.udiseCode).toBe("09000000000");
      expect(branding.portalSubtitle).toBe("Demo School Management Portal");
      expect(branding.metaUrl).toBe("");
    });

    it("does not leak real school or department names in any string field", () => {
      const branding = getSchoolBranding(true);
      const values = Object.values(branding).filter(
        (v): v is string => typeof v === "string"
      );

      for (const val of values) {
        expect(val).not.toContain("Chandpur");
        expect(val).not.toContain("Tarhar");
        expect(val).not.toContain("चांदपुर");
        expect(val).not.toContain("तरहर");
        expect(val).not.toContain("09530607202");
        expect(val).not.toContain("Uttar Pradesh");
        expect(val).not.toContain("Basic Education Department");
        expect(val).not.toContain("Official Administrative Portal");
        expect(val).not.toContain("आधिकारिक प्रशासनिक पोर्टल");
      }
    });
  });

  describe("Non-demo mode (DEMO_MODE unset or 'false')", () => {
    it("returns exact byte-for-byte real school branding when DEMO_MODE is unset", () => {
      delete process.env.DEMO_MODE;
      const branding = getSchoolBranding();

      expect(branding.isDemo).toBe(false);
      expect(branding.schoolNameEnglish).toBe("Composite School Chandpur Tarhar");
      expect(branding.schoolNameHindi).toBe("कम्पोजिट विद्यालय चांदपुर तरहर");
      expect(branding.schoolNameCombined).toBe(
        "कम्पोजिट विद्यालय चांदपुर तरहर (Composite Vidyalaya Chandpur Tarahar)"
      );
      expect(branding.udiseCode).toBe("09530607202");
      expect(branding.schoolBlock).toBe("Paraspur");
      expect(branding.schoolDistrict).toBe("Gonda");
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
      expect(branding.tcAddressMeta).toBe(
        "ब्लॉक - परासपुर, तहसील - कर्नलगंज, जनपद - गोंडा"
      );
      expect(branding.metaTitle).toBe("Composite School Chandpur Tarhar - ERP");
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
