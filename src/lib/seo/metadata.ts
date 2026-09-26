import type { Metadata } from "next";
import type { Locale } from "@/i18n/pathnames";
import { targetSize } from "@/lib/image/sizing";
import { mediaUrl } from "@/lib/media/keys";
import { SITE_URL } from "@/lib/site";
import { languageAlternates, localizedUrl, type PublicPath } from "./urls";

export type OgImage = { url: string; width?: number; height?: number; alt?: string };

export const SITE_NAME = "Cosmo Photos";
export const DEFAULT_OG_IMAGE: OgImage = { url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: SITE_NAME };

const OG_LOCALE = { de: "de_DE", en: "en_US" } as const;

type Input = {
  path: PublicPath;
  locale: Locale;
  /** Seitentitel; das Layout ergänzt „· Cosmo Photos“ (außer bei absoluteTitle). */
  title: string;
  description: string;
  image?: OgImage | null;
  absoluteTitle?: boolean;
};

/** Metadaten einer öffentlichen Seite (Spec §10): Canonical, hreflang, Open Graph und Twitter-Karte. */
export function pageMetadata({ path, locale, title, description, image = null, absoluteTitle = false }: Input): Metadata {
  const url = localizedUrl(path, locale);
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const images = [image ?? DEFAULT_OG_IMAGE];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === "de" ? "en" : "de"]],
      images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((entry) => entry.url) },
  };
}

/** Vorschaubild aus dem Portfolio: die 1600er-Größe mit ihren echten Maßen (kleine Originale werden nicht vergrößert). */
export function portfolioOgImage(image: { id: string; width: number; height: number }, alt: string): OgImage {
  const { width, height } = targetSize(image.width, image.height, 1600);
  return { url: `${SITE_URL}${mediaUrl("portfolio", image.id, 1600)}`, width, height, alt };
}
