/**
 * src/lib/branding.ts
 *
 * Provides institution identity branding.
 * When DEMO_MODE is "true", returns anonymised fictional branding to ensure
 * the application does not present itself as a real government institution.
 * When DEMO_MODE is unset or false, returns the exact real school identity.
 */

import { isDemoMode } from "./demo-mode";

export interface SchoolBranding {
  isDemo: boolean;
  schoolNameEnglish: string;
  schoolNameHindi: string;
  schoolNameCombined: string;
  udiseCode: string;
  schoolBlock: string;
  schoolBlockHindi: string;
  schoolDistrict: string;
  schoolDistrictHindi: string;
  location: string;
  governanceLine: string;
  governanceShort: string;
  portalSubtitle: string;
  portalSubtitleHindi: string;
  portalCategory: string;
  tcAddressMeta: string;
  loginMobileSubtitle: string;
  schoolTitleLine1: string;
  schoolTitleLine2: string;
  systemTag: string;
  showGovtMarks: boolean;
  sampleVillage: string;
  metaTitle: string;
  metaDescription: string;
  metaUrl: string;
}

export function getSchoolBranding(overrideDemo?: boolean): SchoolBranding {
  const isDemo = overrideDemo !== undefined ? overrideDemo : isDemoMode();

  if (isDemo) {
    return {
      isDemo: true,
      showGovtMarks: false,
      sampleVillage: "Shantinagar",
      schoolNameEnglish: "Demo Composite School",
      schoolNameHindi: "डेमो कम्पोजिट विद्यालय",
      schoolNameCombined: "डेमो कम्पोजिट विद्यालय (Demo Composite School)",
      udiseCode: "09000000000",
      schoolBlock: "Demo Block",
      schoolBlockHindi: "डेमो ब्लॉक",
      schoolDistrict: "Demo District",
      schoolDistrictHindi: "डेमो जनपद",
      location: "Demo School",
      governanceLine: "School Education System · Academic Administration",
      governanceShort: "Demo School Management Portal",
      portalSubtitle: "Demo School Management Portal",
      portalSubtitleHindi: "डेमो स्कूल प्रबंधन पोर्टल",
      portalCategory: "Demo School Management Portal",
      tcAddressMeta: "ब्लॉक - डेमो ब्लॉक, जनपद - डेमो जनपद",
      loginMobileSubtitle: "Demo School · डेमो कम्पोजिट विद्यालय",
      schoolTitleLine1: "Demo Composite School",
      schoolTitleLine2: "",
      systemTag: "Demo Academic System",
      metaTitle: "Demo Composite School - ERP",
      metaDescription:
        "Demonstration ERP portal for Demo Composite School. Synthetic data only for academic evaluation.",
      metaUrl: "",
    };
  }

  return {
    isDemo: false,
    showGovtMarks: true,
    sampleVillage: "Chandpur",
    schoolNameEnglish: "Composite School Chandpur Tarhar",
    schoolNameHindi: "कम्पोजिट विद्यालय चांदपुर तरहर",
    schoolNameCombined:
      "कम्पोजिट विद्यालय चांदपुर तरहर (Composite Vidyalaya Chandpur Tarahar)",
    udiseCode: "09530607202",
    schoolBlock: "Paraspur",
    schoolBlockHindi: "परसपुर",
    schoolDistrict: "Gonda",
    schoolDistrictHindi: "गोंडा",
    location: "Chandpur Tarhar",
    governanceLine: "Government of Uttar Pradesh · Basic Education Department",
    governanceShort: "Govt. of Uttar Pradesh - Basic Education Dept.",
    portalSubtitle: "Official Administrative Portal for Teachers & Authorities",
    portalSubtitleHindi: "आधिकारिक प्रशासनिक पोर्टल",
    portalCategory: "Government School Portal",
    tcAddressMeta: "ब्लॉक - परासपुर, तहसील - कर्नलगंज, जनपद - गोंडा",
    loginMobileSubtitle: "Chandpur Tarhar · कम्पोजिट विद्यालय",
    schoolTitleLine1: "Composite School",
    schoolTitleLine2: "Chandpur Tarhar",
    systemTag: "UP Basic Shiksha",
    metaTitle: "Composite School Chandpur Tarhar - ERP",
    metaDescription:
      "Government school ERP portal for Composite School Chandpur Tarhar. Manage students, attendance, marks, mid-day meals, and more.",
    metaUrl: "",
  };
}
