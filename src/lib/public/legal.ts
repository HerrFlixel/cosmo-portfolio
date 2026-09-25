import type { Settings } from "@/lib/settings/schema";

/** Rechtstexte: Die englische Seite zeigt den deutschen Text, solange es keinen englischen gibt (Impressum muss erreichbar sein). */
export function legalText(settings: Settings, kind: "imprint" | "privacy", locale: "de" | "en"): { text: string; fallback: boolean } {
  const german = settings[`${kind}_de`];
  const english = settings[`${kind}_en`];
  if (locale === "de" || english.trim()) return { text: locale === "de" ? german : english, fallback: false };
  return { text: german, fallback: german.trim() !== "" };
}
