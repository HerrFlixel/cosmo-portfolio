import { z } from "zod";
import { isUuid } from "@/lib/media/keys";

const text = (max: number) => z.string().trim().max(max, `Höchstens ${max} Zeichen.`);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
};

/** Alle pflegbaren Texte und Links (Spec §8). Leerer String = nicht gesetzt. */
export const settingsSchema = z.object({
  hero_headline_de: text(120),
  hero_headline_en: text(120),
  about_statement_de: text(200),
  about_statement_en: text(200),
  about_text_de: text(5000),
  about_text_en: text(5000),
  about_portrait_id: z.string().trim().refine((v) => v === "" || isUuid(v), "Ungültige Bild-ID."),
  references: text(2000),
  contact_email: z.string().trim().refine((v) => v === "" || EMAIL.test(v), "Keine gültige E-Mail-Adresse."),
  instagram_url: z.string().trim().refine((v) => v === "" || isHttpsUrl(v), "Bitte eine vollständige https-Adresse angeben."),
  pictrs_url: z.string().trim().refine((v) => v === "" || isHttpsUrl(v), "Bitte eine vollständige https-Adresse angeben."),
  imprint_de: text(50000),
  imprint_en: text(50000),
  privacy_de: text(50000),
  privacy_en: text(50000),
});

export type Settings = z.infer<typeof settingsSchema>;
export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as (keyof Settings)[];
export const SETTINGS_DEFAULTS = Object.fromEntries(SETTINGS_KEYS.map((key) => [key, ""])) as Settings;
