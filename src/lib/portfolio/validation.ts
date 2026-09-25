import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";

export const categorySchema = z.enum(CATEGORIES, "Unbekannte Kategorie.");

export const createImageSchema = z.strictObject({
  id: z.uuid(),
  category: categorySchema,
  width: z.int().min(1).max(30000),
  height: z.int().min(1).max(30000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Ungültige Farbe."),
});

const altText = z.string().trim().max(300, "Alt-Text: höchstens 300 Zeichen.").nullable().optional();

export const patchImageSchema = z.strictObject({
  visible: z.boolean().optional(),
  altDe: altText,
  altEn: altText,
  role: z.enum(["hero", "chapter", "chapter_preview"]).nullable().optional(),
});

export const orderSchema = z.strictObject({
  category: categorySchema,
  ids: z.array(z.uuid()).max(5000),
});
