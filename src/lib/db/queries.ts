import { db } from "./index";
import { images, downloadCodes, downloadCodeImages, clientLogos, settings } from "./schema";
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

export async function verifyDownloadCode(code: string) {
  const result = await db
    .select()
    .from(downloadCodes)
    .where(and(eq(downloadCodes.code, code), eq(downloadCodes.active, true)));

  const downloadCode = result[0];
  if (!downloadCode) return null;

  if (downloadCode.expiresAt && new Date(downloadCode.expiresAt) < new Date()) {
    return null;
  }

  const codeImages = await db
    .select({ image: images })
    .from(downloadCodeImages)
    .innerJoin(images, eq(downloadCodeImages.imageId, images.id))
    .where(eq(downloadCodeImages.codeId, downloadCode.id));

  return {
    ...downloadCode,
    images: codeImages.map((row) => row.image),
  };
}
