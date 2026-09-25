export type Locale = "de" | "en";

const UNITS = ["B", "KB", "MB", "GB", "TB"];
const BERLIN = "Europe/Berlin";

/** Dezimale Einheiten (1 GB = 10⁹ Byte), wie sie Betriebssysteme und Browser anzeigen. */
export function formatBytes(bytes: number, locale: Locale): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const number = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: unit >= 2 ? 1 : 0 }).format(value);
  return `${number} ${UNITS[unit]}`;
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "de"
    ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: BERLIN }).format(date)
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: BERLIN }).format(date);
}

/** Kalendertag in Berlin als YYYY-MM-DD (Wert für <input type="date">). */
export function formatDateInput(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: BERLIN }).format(new Date(iso));
}

/**
 * Ablaufzeitpunkt für einen gewählten Tag: 21:59:59 UTC liegt in Sommer- und Winterzeit noch am selben Berliner Tag
 * (23:59:59 bzw. 22:59:59 Ortszeit) – Anzeige und Eingabefeld zeigen also immer den gewählten Tag.
 */
export function endOfBerlinDay(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ungültiges Datum: ${date}`);
  return `${date}T21:59:59.000Z`;
}
