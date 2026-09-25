import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptText, encryptText } from "@/lib/crypto/box";
import type { Db } from "@/lib/db/client";
import { favorites, galleries, galleryEvents, galleryImages } from "@/lib/db/schema";
import { GALLERY_VARIANTS, galleryKey } from "./keys";
import { generateGalleryPassword } from "./password";
import { SLUG_PATTERN, slugify } from "./slug";

export type Gallery = typeof galleries.$inferSelect;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type GalleryEvent = typeof galleryEvents.$inferSelect;
export type GalleryState = "draft" | "online" | "expired";
export type GalleryListItem = Gallery & { imageCount: number; views: number; downloads: number; favorites: number };
export type VisitorFavorites = { visitorName: string; images: GalleryImage[] };
export type EventType = GalleryEvent["type"];

export const GALLERY_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export class GalleryError extends Error {
  readonly status: 400 | 404 | 409;
  constructor(message: string, status: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "GalleryError";
    this.status = status;
  }
}

const galleryNotFound = () => new GalleryError("Galerie nicht gefunden.", 404);
const imageNotFound = () => new GalleryError("Bild nicht gefunden.", 404);

export function galleryState(gallery: Gallery, now: Date): GalleryState {
  if (gallery.status === "draft") return "draft";
  if (gallery.expiresAt !== null && gallery.expiresAt <= now.toISOString()) return "expired";
  return "online";
}

/** Anzeigename für Favoriten: 1–40 Zeichen nach Trimmen, sonst null. */
export function normalizeVisitorName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  return name.length >= 1 && [...name].length <= 40 ? name : null;
}

async function passwordFields(password: string, secret: string) {
  const passwordHash = await hashPassword(password);
  return { passwordHash, passwordSalt: passwordHash.split("$")[2], passwordCipher: await encryptText(password, secret) };
}

async function uniqueSlug(db: Db, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 56).replace(/-+$/, "")}-${n}`;
    const [taken] = await db.select({ id: galleries.id }).from(galleries).where(eq(galleries.slug, candidate));
    if (!taken) return candidate;
  }
}

export async function createGallery(db: Db, secret: string, input: { title: string; shootDate?: string | null }, now: Date) {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) throw new GalleryError("Der Titel braucht 1–120 Zeichen.");
  const password = generateGalleryPassword();
  const [gallery] = await db
    .insert(galleries)
    .values({
      id: crypto.randomUUID(),
      slug: await uniqueSlug(db, slugify(title)),
      title,
      shootDate: input.shootDate || null,
      expiresAt: new Date(now.getTime() + GALLERY_TTL_DAYS * DAY_MS).toISOString(),
      ...(await passwordFields(password, secret)),
    })
    .returning();
  return { gallery, password };
}

export async function getGalleryById(db: Db, id: string): Promise<Gallery | undefined> {
  const [gallery] = await db.select().from(galleries).where(eq(galleries.id, id));
  return gallery;
}

export async function getGalleryBySlug(db: Db, slug: string): Promise<Gallery | undefined> {
  const [gallery] = await db.select().from(galleries).where(eq(galleries.slug, slug));
  return gallery;
}

type GalleryPatch = { title?: string; shootDate?: string | null; slug?: string; expiresAt?: string | null; status?: "draft" | "online"; coverImageId?: string | null };

export async function updateGallery(db: Db, id: string, patch: GalleryPatch): Promise<Gallery> {
  if (patch.slug !== undefined) {
    if (!SLUG_PATTERN.test(patch.slug) || patch.slug.length > 60) throw new GalleryError("Kurzname: nur a–z, 0–9 und Bindestriche, max. 60 Zeichen.");
    const [taken] = await db.select({ id: galleries.id }).from(galleries).where(eq(galleries.slug, patch.slug));
    if (taken && taken.id !== id) throw new GalleryError("Dieser Kurzname ist schon vergeben.", 409);
  }
  if (patch.title !== undefined && (patch.title.trim().length < 1 || patch.title.trim().length > 120)) {
    throw new GalleryError("Der Titel braucht 1–120 Zeichen.");
  }
  const [gallery] = await db
    .update(galleries)
    .set({ ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}) })
    .where(eq(galleries.id, id))
    .returning();
  if (!gallery) throw galleryNotFound();
  return gallery;
}

export async function extendGallery(db: Db, id: string, now: Date): Promise<Gallery> {
  const gallery = await getGalleryById(db, id);
  if (!gallery) throw galleryNotFound();
  const from = Math.max(now.getTime(), gallery.expiresAt ? Date.parse(gallery.expiresAt) : 0);
  return updateGallery(db, id, { expiresAt: new Date(from + GALLERY_TTL_DAYS * DAY_MS).toISOString() });
}

export async function setGalleryPassword(db: Db, secret: string, id: string, password: string): Promise<Gallery> {
  const clean = password.trim();
  if (clean.length < 8 || clean.length > 64) throw new GalleryError("Das Passwort braucht 8–64 Zeichen.");
  const [gallery] = await db.update(galleries).set(await passwordFields(clean, secret)).where(eq(galleries.id, id)).returning();
  if (!gallery) throw galleryNotFound();
  return gallery;
}

export function revealPassword(secret: string, gallery: Gallery): Promise<string> {
  return decryptText(gallery.passwordCipher, secret);
}

export function checkGalleryPassword(gallery: Gallery, password: string): Promise<boolean> {
  return verifyPassword(password, gallery.passwordHash);
}

export async function listGalleries(db: Db): Promise<GalleryListItem[]> {
  const rows = await db.select().from(galleries).orderBy(desc(galleries.createdAt));
  const images = await db.select({ id: galleryImages.galleryId, n: count() }).from(galleryImages).groupBy(galleryImages.galleryId);
  const events = await db
    .select({ id: galleryEvents.galleryId, type: galleryEvents.type, n: count() })
    .from(galleryEvents)
    .groupBy(galleryEvents.galleryId, galleryEvents.type);
  const favs = await db.select({ id: favorites.galleryId, n: count() }).from(favorites).groupBy(favorites.galleryId);
  const lookup = (list: { id: string; n: number }[], id: string) => list.find((row) => row.id === id)?.n ?? 0;
  return rows.map((gallery) => {
    const own = events.filter((e) => e.id === gallery.id);
    const sum = (types: EventType[]) => own.filter((e) => types.includes(e.type)).reduce((total, e) => total + e.n, 0);
    return {
      ...gallery,
      imageCount: lookup(images, gallery.id),
      views: sum(["view"]),
      downloads: sum(["download_image", "download_zip"]),
      favorites: lookup(favs, gallery.id),
    };
  });
}

export function listImages(db: Db, galleryId: string): Promise<GalleryImage[]> {
  return db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.galleryId, galleryId))
    .orderBy(asc(sql`${galleryImages.filename} COLLATE NOCASE`), asc(galleryImages.filename));
}

export async function getImage(db: Db, galleryId: string, imageId: string): Promise<GalleryImage | undefined> {
  const [image] = await db
    .select()
    .from(galleryImages)
    .where(and(eq(galleryImages.galleryId, galleryId), eq(galleryImages.id, imageId)));
  return image;
}

type NewImage = { id: string; galleryId: string; filename: string; bytes: number; crc32: number; width: number; height: number; color: string };

/**
 * DB-Eintrag erst, wenn Vorschau, Web-Größe und Original im Bucket liegen.
 * Eine wiederholte Registrierung (z. B. Antwort verloren, Upload wiederholt) aktualisiert den Eintrag.
 */
export async function addImage(db: Db, bucket: R2Bucket, input: NewImage): Promise<GalleryImage> {
  const heads = await Promise.all(GALLERY_VARIANTS.map((variant) => bucket.head(galleryKey(input.galleryId, input.id, variant))));
  if (heads.some((head) => head === null)) throw new GalleryError("Upload unvollständig: Vorschau, Web-Größe und Original müssen vorhanden sein.");
  const fields = { filename: input.filename, bytes: input.bytes, crc32: input.crc32, width: input.width, height: input.height, color: input.color };
  const [image] = await db
    .insert(galleryImages)
    .values({ id: input.id, galleryId: input.galleryId, ...fields })
    .onConflictDoUpdate({ target: galleryImages.id, set: fields, setWhere: eq(galleryImages.galleryId, input.galleryId) })
    .returning();
  if (!image) throw new GalleryError("Diese Bild-ID gehört zu einer anderen Galerie.", 409);
  return image;
}

export async function removeImage(db: Db, bucket: R2Bucket, galleryId: string, imageId: string): Promise<void> {
  const [image] = await db
    .delete(galleryImages)
    .where(and(eq(galleryImages.galleryId, galleryId), eq(galleryImages.id, imageId)))
    .returning();
  if (!image) throw imageNotFound();
  await db.update(galleries).set({ coverImageId: null }).where(and(eq(galleries.id, galleryId), eq(galleries.coverImageId, imageId)));
  await bucket.delete(GALLERY_VARIANTS.map((variant) => galleryKey(galleryId, imageId, variant)));
}

/** Löscht alle Dateien der Galerie (seitenweise, je 1000) und dann die Galerie samt Bildern, Favoriten, Ereignissen. */
export async function deleteGallery(db: Db, bucket: R2Bucket, id: string): Promise<void> {
  if (!(await getGalleryById(db, id))) throw galleryNotFound();
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: `${id}/`, cursor, limit: 1000 });
    if (page.objects.length > 0) await bucket.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await db.delete(galleries).where(eq(galleries.id, id));
}

export async function addFavorite(db: Db, galleryId: string, imageId: string, visitorName: string): Promise<void> {
  if (!(await getImage(db, galleryId, imageId))) throw imageNotFound();
  await db.insert(favorites).values({ galleryId, imageId, visitorName }).onConflictDoNothing();
}

export async function removeFavorite(db: Db, galleryId: string, imageId: string, visitorName: string): Promise<void> {
  await db
    .delete(favorites)
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.imageId, imageId), eq(favorites.visitorName, visitorName)));
}

export async function listFavoriteIds(db: Db, galleryId: string, visitorName: string): Promise<string[]> {
  const rows = await db
    .select({ id: favorites.imageId })
    .from(favorites)
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.visitorName, visitorName)));
  return rows.map((row) => row.id);
}

export async function favoritesByVisitor(db: Db, galleryId: string): Promise<VisitorFavorites[]> {
  const rows = await db
    .select({ visitorName: favorites.visitorName, image: galleryImages })
    .from(favorites)
    .innerJoin(galleryImages, eq(favorites.imageId, galleryImages.id))
    .where(eq(favorites.galleryId, galleryId))
    .orderBy(asc(favorites.visitorName), asc(sql`${galleryImages.filename} COLLATE NOCASE`));
  const result: VisitorFavorites[] = [];
  for (const row of rows) {
    const last = result.at(-1);
    if (last && last.visitorName === row.visitorName) last.images.push(row.image);
    else result.push({ visitorName: row.visitorName, images: [row.image] });
  }
  return result;
}

export async function logEvent(
  db: Db,
  event: { galleryId: string; type: EventType; visitorName?: string | null; imageId?: string | null; zipPart?: number | null },
): Promise<void> {
  await db.insert(galleryEvents).values({
    galleryId: event.galleryId,
    type: event.type,
    visitorName: event.visitorName ?? null,
    imageId: event.imageId ?? null,
    zipPart: event.zipPart ?? null,
  });
}

export function listEvents(db: Db, galleryId: string, limit = 200): Promise<GalleryEvent[]> {
  return db
    .select()
    .from(galleryEvents)
    .where(eq(galleryEvents.galleryId, galleryId))
    .orderBy(desc(galleryEvents.createdAt), desc(galleryEvents.id))
    .limit(limit);
}
