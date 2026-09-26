import type { MetadataRoute } from "next";
import { PATHNAMES } from "@/i18n/pathnames";
import { languageAlternates, localizedUrl, type PublicPath } from "./urls";

/** Sitemap DE/EN mit hreflang (Spec §10): jede öffentliche Seite in beiden Sprachen. Galerien bleiben draußen. */
export function sitemapEntries(): MetadataRoute.Sitemap {
  return (Object.keys(PATHNAMES) as PublicPath[]).flatMap((path) =>
    (["de", "en"] as const).map((locale) => ({
      url: localizedUrl(path, locale),
      alternates: { languages: languageAlternates(path) },
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.7,
    })),
  );
}
