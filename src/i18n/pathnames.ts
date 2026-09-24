export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Interne Pfade (= deutsche Pfade) → lokalisierte externe Pfade (Spec §3.2). */
export const PATHNAMES = {
  "/": "/",
  "/floorball": "/floorball",
  "/volleyball": "/volleyball",
  "/fussball": { de: "/fussball", en: "/football" },
  "/hochzeiten": { de: "/hochzeiten", en: "/weddings" },
  "/studio": "/studio",
  "/ueber-mich": { de: "/ueber-mich", en: "/about" },
  "/kontakt": { de: "/kontakt", en: "/contact" },
  "/kunden": { de: "/kunden", en: "/clients" },
  "/impressum": { de: "/impressum", en: "/imprint" },
  "/datenschutz": { de: "/datenschutz", en: "/privacy" },
} as const;

export function externalPath(internal: keyof typeof PATHNAMES, locale: Locale): string {
  const entry = PATHNAMES[internal];
  return typeof entry === "string" ? entry : entry[locale];
}
