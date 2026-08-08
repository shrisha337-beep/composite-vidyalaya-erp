import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["hi", "en"],
  defaultLocale: "hi", // school-facing default; admin/teacher can switch to en
});
