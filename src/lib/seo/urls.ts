import { externalPath, type Locale, type PATHNAMES } from "@/i18n/pathnames";
import { SITE_URL } from "@/lib/site";

export type PublicPath = keyof typeof PATHNAMES;

/**
 * Absolute URL einer öffentlichen Seite: Deutsch ohne Präfix, Englisch mit /en und lokalisiertem Pfad (Spec §3.2).
 * Die Startseite ohne Schrägstrich, wie Next die Canonical-URL ausgibt: Sitemap, Canonical und og:url stimmen überein.
 */
export function localizedUrl(path: PublicPath, locale: Locale): string {
  const external = externalPath(path, locale);
  if (locale === "de") return external === "/" ? SITE_URL : `${SITE_URL}${external}`;
  return `${SITE_URL}/en${external === "/" ? "" : external}`;
}

/** hreflang-Paar (Spec §10); x-default ist die deutsche Fassung. */
export function languageAlternates(path: PublicPath): Record<"de" | "en" | "x-default", string> {
  return { de: localizedUrl(path, "de"), en: localizedUrl(path, "en"), "x-default": localizedUrl(path, "de") };
}
