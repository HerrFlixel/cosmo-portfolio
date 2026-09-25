import { and, asc, count, eq, max, ne, sql } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Db } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { IMAGE_SIZES, mediaKey } from "@/lib/media/keys";

export type PortfolioImage = typeof portfolioImages.$inferSelect;
export type PortfolioRole = NonNullable<PortfolioImage["role"]>;
export type NewPortfolioImage = { id: string; category: Category; width: number; height: number; color: string };
export type ImagePatch = { visible?: boolean; altDe?: string | null; altEn?: string | null };

export const MAX_HERO = 3;
export const MAX_CHAPTER_PREVIEW = 5;

export class PortfolioError extends Error {
  readonly status: 400 | 404;
  constructor(message: string, status: 400 | 404 = 400) {
    super(message);
    this.name = "PortfolioError";
    this.status = status;
  }
}

const notFound = () => new PortfolioError("Bild nicht gefunden.", 404);

export function listByCategory(db: Db, category: Category): Promise<PortfolioImage[]> {
  return db
    .select()
    .from(portfolioImages)
    .where(eq(portfolioImages.category, category))
    .orderBy(asc(portfolioImages.sort), asc(portfolioImages.createdAt));
}

export async function countByCategory(db: Db): Promise<Record<Category, { total: number; visible: number }>> {
  const rows = await db
    .select({ category: portfolioImages.category, total: count(), visible: sql<number>`sum(${portfolioImages.visible})` })
    .from(portfolioImages)
    .groupBy(portfolioImages.category);
  const result = Object.fromEntries(CATEGORIES.map((c) => [c, { total: 0, visible: 0 }])) as Record<Category, { total: number; visible: number }>;
  for (const row of rows) result[row.category] = { total: row.total, visible: Number(row.visible ?? 0) };
  return result;
}

/** Legt den DB-Eintrag erst an, wenn alle Größen in R2 liegen. Halbe Uploads werden nie sichtbar. */
export async function createImage(db: Db, media: R2Bucket, input: NewPortfolioImage): Promise<PortfolioImage> {
  const heads = await Promise.all(IMAGE_SIZES.map((size) => media.head(mediaKey("portfolio", input.id, size))));
  if (heads.some((head) => head === null)) throw new PortfolioError("Upload unvollständig: nicht alle Bildgrößen sind vorhanden.");
  const [{ last }] = await db
    .select({ last: max(portfolioImages.sort) })
    .from(portfolioImages)
    .where(eq(portfolioImages.category, input.category));
  const [row] = await db.insert(portfolioImages).values({ ...input, sort: (last ?? -1) + 1 }).returning();
  return row;
}

export async function updateImage(db: Db, id: string, patch: ImagePatch): Promise<PortfolioImage> {
  const [row] = await db.update(portfolioImages).set(patch).where(eq(portfolioImages.id, id)).returning();
  if (!row) throw notFound();
  return row;
}

export async function setRole(db: Db, id: string, role: PortfolioRole | null): Promise<PortfolioImage> {
  const [image] = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id));
  if (!image) throw notFound();

  if (role === "hero") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(portfolioImages)
      .where(and(eq(portfolioImages.role, "hero"), ne(portfolioImages.id, id)));
    if (n >= MAX_HERO) throw new PortfolioError(`Maximal ${MAX_HERO} Hero-Bilder.`);
  }
  if (role === "chapter_preview") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(portfolioImages)
      .where(and(eq(portfolioImages.category, image.category), eq(portfolioImages.role, "chapter_preview"), ne(portfolioImages.id, id)));
    if (n >= MAX_CHAPTER_PREVIEW) throw new PortfolioError(`Maximal ${MAX_CHAPTER_PREVIEW} Kapitel-Vorschaubilder pro Kategorie.`);
  }
  if (role === "chapter") {
    await db
      .update(portfolioImages)
      .set({ role: null })
      .where(and(eq(portfolioImages.category, image.category), eq(portfolioImages.role, "chapter"), ne(portfolioImages.id, id)));
  }
  const [row] = await db.update(portfolioImages).set({ role }).where(eq(portfolioImages.id, id)).returning();
  return row;
}

export async function reorder(db: Db, category: Category, ids: readonly string[]): Promise<void> {
  const current = await db.select({ id: portfolioImages.id }).from(portfolioImages).where(eq(portfolioImages.category, category));
  const known = new Set(current.map((row) => row.id));
  const complete = ids.length === known.size && new Set(ids).size === ids.length && ids.every((id) => known.has(id));
  if (!complete) throw new PortfolioError("Die Reihenfolge passt nicht zu den Bildern der Kategorie.");
  if (ids.length === 0) return;
  const [first, ...rest] = ids.map((id, index) => db.update(portfolioImages).set({ sort: index }).where(eq(portfolioImages.id, id)));
  await db.batch([first, ...rest]);
}

export async function deleteImage(db: Db, media: R2Bucket, id: string): Promise<void> {
  const [row] = await db.delete(portfolioImages).where(eq(portfolioImages.id, id)).returning();
  if (!row) throw notFound();
  await media.delete(IMAGE_SIZES.map((size) => mediaKey("portfolio", id, size)));
}
