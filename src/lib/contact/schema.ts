import { z } from "zod";

// CSP (Plan 6): Ohne JIT probiert Zod nie `Function("")` aus. Die Probe ist harmlos, würde aber auf jeder Seite mit
// Kontaktformular einen CSP-Verstoß melden (Skripte nur mit Nonce, kein eval).
z.config({ jitless: true });

export const CONTACT_TOPICS = ["sport", "wedding", "studio", "gallery", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Bezeichnungen im Betreff der Mail an Felix (immer Deutsch). */
export const TOPIC_LABELS: Record<ContactTopic, string> = { sport: "Sport", wedding: "Hochzeit", studio: "Studio", gallery: "Galerie", other: "Sonstiges" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(200).regex(EMAIL),
  topic: z.enum(CONTACT_TOPICS).catch("other"),
  message: z.string().trim().min(10).max(5000),
});
