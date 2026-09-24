import { defineRouting } from "next-intl/routing";
import { LOCALES, PATHNAMES } from "./pathnames";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "de",
  localePrefix: "as-needed",
  pathnames: PATHNAMES,
});
