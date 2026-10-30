import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getSchoolBranding } from "@/lib/branding";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "hi" | "en")) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`./messages/${locale}.json`)).default;
  const branding = getSchoolBranding();

  if (branding.isDemo) {
    return {
      locale,
      messages: {
        ...messages,
        common: {
          ...messages.common,
          schoolName:
            locale === "hi"
              ? branding.schoolNameHindi
              : branding.schoolNameEnglish,
        },
      },
    };
  }

  return {
    locale,
    messages,
  };
});
