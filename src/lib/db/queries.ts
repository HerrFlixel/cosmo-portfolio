import { db } from "./index";
import { images, albums, clientLogos, settings } from "./schema";
import { eq, and, asc } from "drizzle-orm";

export async function getVisibleImages() {
  return db.select().from(images).where(eq(images.visible, true)).orderBy(asc(images.sortOrder));
}

export async function getAllImages() {
  return db.select().from(images).orderBy(asc(images.sortOrder));
}

export async function getSetting(key: string) {
  const result = await db.select().from(settings).where(eq(settings.key, key));
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getClientLogos() {
  return db.select().from(clientLogos).orderBy(asc(clientLogos.sortOrder));
}

export async function verifyAlbumCode(code: string) {
  const result = await db
    .select()
    .from(albums)
    .where(and(eq(albums.code, code), eq(albums.active, true)));

  const album = result[0];
  if (!album) return null;

  if (album.expiresAt && new Date(album.expiresAt) < new Date()) {
    return null;
  }

  return album;
}
