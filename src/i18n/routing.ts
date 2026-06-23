import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  pathnames: {
    "/": "/",
    "/projects/[slug]": {
      de: "/projekte/[slug]",
      en: "/projects/[slug]",
    },
    "/about": "/about",
    "/contact": "/contact",
    "/downloads": "/downloads",
    "/advertising": {
      de: "/werbung",
      en: "/advertising",
    },
  },
});
