import type { Locale } from "@/lib/format";

export type GalleryLocale = Locale;

/** Cookie NEXT_LOCALE (wie die öffentliche Seite) → sonst Browsersprache (deutsch → de, sonst en). */
export function resolveGalleryLocale(cookieLocale: string | undefined, acceptLanguage: string | null): GalleryLocale {
  if (cookieLocale === "de" || cookieLocale === "en") return cookieLocale;
  if (acceptLanguage === null) return "de";
  return /^\s*de\b/i.test(acceptLanguage) ? "de" : "en";
}
