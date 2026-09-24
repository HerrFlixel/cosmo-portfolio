/** Die fünf Portfolio-Kategorien: DB-Wert, deutscher Pfad und Anzeige-Reihenfolge. */
export const CATEGORIES = ["floorball", "volleyball", "fussball", "hochzeiten", "studio"] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
