import type { Locale } from "@/i18n/pathnames";
import { mediaUrl } from "@/lib/media/keys";
import type { Settings } from "@/lib/settings/schema";
import { SITE_URL } from "@/lib/site";
import { localizedUrl } from "./urls";

/** Strukturierte Daten (Spec §10): schema.org kennt keinen „Photographer“, deshalb Person mit Berufsbezeichnung. */
export function personJsonLd(settings: Settings, locale: Locale): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Felix Vatterodt",
    alternateName: "Cosmo Photos",
    jobTitle: locale === "de" ? "Fotograf" : "Photographer",
    url: localizedUrl("/", locale),
    ...(settings.about_portrait_id ? { image: `${SITE_URL}${mediaUrl("site", settings.about_portrait_id, 1600)}` } : {}),
    ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {}),
    address: { "@type": "PostalAddress", addressLocality: "Hamburg", addressCountry: "DE" },
    knowsAbout: locale === "de" ? ["Floorball", "Volleyball", "Fußball", "Hochzeiten", "Studiofotografie"] : ["Floorball", "Volleyball", "Football", "Weddings", "Studio photography"],
  };
}

/** Als Inhalt eines <script type="application/ld+json">: „<“ maskiert, damit Texte das Element nie schließen. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
