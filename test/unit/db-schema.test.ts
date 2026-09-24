import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import {
  favorites,
  galleries,
  galleryEvents,
  galleryImages,
  portfolioImages,
  settings,
} from "@/lib/db/schema";

// Speicher ist pro Testdatei isoliert, nicht pro Test: daher eindeutige Slugs.
const db = () => createDb(env.DB);
const uid = () => crypto.randomUUID();

async function insertGallery(slug = `g-${uid().slice(0, 8)}`) {
  const id = uid();
  await db().insert(galleries).values({
    id,
    slug,
    title: "Final4 Zwickau 2026",
    passwordHash: "hash",
    passwordSalt: "salt",
  });
  return id;
}

async function insertImage(galleryId: string, crc32 = 0xcbf43926) {
  const id = uid();
  await db().insert(galleryImages).values({
    id,
    galleryId,
    filename: "IMG_2041.jpg",
    bytes: 18_000_000,
    crc32,
    width: 6000,
    height: 4000,
    color: "#1a1a1a",
    sort: 0,
  });
  return id;
}

/** Drizzle verpackt D1-Fehler; die eigentliche Meldung steckt in `cause`. */
async function errorText(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "";
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return `${err.message} ${err.cause?.message ?? ""}`;
  }
}

describe("D1 schema", () => {
  it("creates galleries as draft with ISO timestamps and no expiry", async () => {
    const id = await insertGallery();
    const [row] = await db().select().from(galleries).where(eq(galleries.id, id));
    expect(row.status).toBe("draft");
    expect(row.expiresAt).toBeNull();
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("rejects duplicate gallery slugs", async () => {
    await insertGallery("same-slug");
    expect(await errorText(insertGallery("same-slug"))).toMatch(/UNIQUE/i);
  });

  it("keeps CRC32 values above 2^31 exact", async () => {
    const g = await insertGallery();
    const img = await insertImage(g, 0xffffffff);
    const [row] = await db().select().from(galleryImages).where(eq(galleryImages.id, img));
    expect(row.crc32).toBe(4294967295);
  });

  it("allows the same favorite for two visitors but not twice for one", async () => {
    const g = await insertGallery();
    const img = await insertImage(g);
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" });
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Tom" });
    expect(
      await errorText(db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" })),
    ).toMatch(/UNIQUE|PRIMARY KEY/i);
  });

  it("deletes images, favorites and events together with the gallery", async () => {
    const g = await insertGallery();
    const img = await insertImage(g);
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" });
    await db().insert(galleryEvents).values({ galleryId: g, type: "view" });

    await db().delete(galleries).where(eq(galleries.id, g));

    expect(await db().select().from(galleryImages).where(eq(galleryImages.galleryId, g))).toHaveLength(0);
    expect(await db().select().from(favorites).where(eq(favorites.galleryId, g))).toHaveLength(0);
    expect(await db().select().from(galleryEvents).where(eq(galleryEvents.galleryId, g))).toHaveLength(0);
  });

  it("stores portfolio images visible by default without a role", async () => {
    const id = uid();
    await db().insert(portfolioImages).values({ id, category: "floorball", width: 2400, height: 3600, color: "#b3261e" });
    const [row] = await db().select().from(portfolioImages).where(eq(portfolioImages.id, id));
    expect(row.visible).toBe(true);
    expect(row.role).toBeNull();
    expect(row.sort).toBe(0);
  });

  it("upserts settings by key", async () => {
    const write = (value: string) =>
      db().insert(settings).values({ key: "hero_headline_de", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
    await write("Hallen, Rauch, Gänsehaut.");
    await write("Neu");
    const rows = await db().select().from(settings).where(eq(settings.key, "hero_headline_de"));
    expect(rows).toEqual([{ key: "hero_headline_de", value: "Neu" }]);
  });
});
