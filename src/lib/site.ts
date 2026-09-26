/** Kanonische Adresse der Seite (Spec §12). Canonical, hreflang, Sitemap, Open Graph und JSON-LD entstehen hieraus. */
export const SITE_URL = "https://cosmo-photos.de";
export const CANONICAL_HOST = new URL(SITE_URL).host;

export type HostPolicy = { redirect: string | null; indexable: boolean };

/**
 * www → Hauptdomain (301). Nur die Hauptdomain darf in den Index: workers.dev, Vorschau und localhost bekommen
 * noindex (Spec §10), damit nie eine Zweitadresse neben cosmo-photos.de auftaucht.
 */
export function hostPolicy(url: URL): HostPolicy {
  if (url.host === `www.${CANONICAL_HOST}`) {
    return { redirect: `${SITE_URL}${url.pathname}${url.search}`, indexable: false };
  }
  return { redirect: null, indexable: url.host === CANONICAL_HOST };
}

/** Für alle Seiten-Antworten; vorhandene (z. B. strengere für /admin und /g) haben Vorrang. Die CSP setzt die Middleware. */
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

/** Ohne includeSubDomains: Unter cosmo-photos.de laufen auch fremde Dienste (Mail bei All-Inkl). */
export const HSTS = "max-age=31536000";
