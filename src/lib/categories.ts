/** Die fünf Portfolio-Kategorien: DB-Wert, deutscher Pfad und Anzeige-Reihenfolge. */
export const CATEGORIES = ["floorball", "volleyball", "fussball", "hochzeiten", "studio"] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Deutsche Namen für den Admin (die öffentliche Seite nutzt next-intl). */
export const CATEGORY_LABELS_DE: Record<Category, string> = {
  floorball: "Floorball",
  volleyball: "Volleyball",
  fussball: "Fußball",
  hochzeiten: "Hochzeiten",
  studio: "Studio",
};
