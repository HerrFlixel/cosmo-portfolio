import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { IMAGE_SIZES, mediaKey } from "@/lib/media/keys";
import {
  MAX_CHAPTER_PREVIEW,
  MAX_HERO,
  PortfolioError,
  countByCategory,
  createImage,
  deleteImage,
  listByCategory,
  reorder,
  setRole,
  updateImage,
} from "@/lib/portfolio/repo";
import type { Category } from "@/lib/categories";

const db = () => createDb(env.DB);

async function uploadVariants(id: string, sizes = IMAGE_SIZES) {
  for (const size of sizes) {
    await env.MEDIA.put(mediaKey("portfolio", id, size), new Uint8Array([0xff, 0xd8, 0xff]), { httpMetadata: { contentType: "image/jpeg" } });
  }
}

async function addImage(category: Category = "floorball") {
  const id = crypto.randomUUID();
  await uploadVariants(id);
  return createImage(db(), env.MEDIA, { id, category, width: 3000, height: 2000, color: "#123456" });
}

beforeEach(async () => {
  await db().delete(portfolioImages);
});

describe("portfolio repository", () => {
  it("appends new images at the end of their category", async () => {
    const a = await addImage();
    const b = await addImage();
    const other = await addImage("studio");
    expect([a.sort, b.sort, other.sort]).toEqual([0, 1, 0]);
    expect(a).toMatchObject({ category: "floorball", width: 3000, height: 2000, color: "#123456", visible: true, role: null });
    expect((await listByCategory(db(), "floorball")).map((i) => i.id)).toEqual([a.id, b.id]);
  });

  it("refuses to create an image when a size is missing in R2 (interrupted upload)", async () => {
    const id = crypto.randomUUID();
    await uploadVariants(id, [800, 1600]);
    await expect(createImage(db(), env.MEDIA, { id, category: "floorball", width: 10, height: 10, color: "#000000" })).rejects.toThrow(
      "Upload unvollständig: nicht alle Bildgrößen sind vorhanden.",
    );
    expect(await listByCategory(db(), "floorball")).toHaveLength(0);
  });

  it("counts total and visible images per category", async () => {
    const a = await addImage();
    await addImage();
    await updateImage(db(), a.id, { visible: false });
    const counts = await countByCategory(db());
    expect(counts.floorball).toEqual({ total: 2, visible: 1 });
    expect(counts.studio).toEqual({ total: 0, visible: 0 });
  });

  it("updates visibility and alt texts, and reports unknown ids", async () => {
    const a = await addImage();
    const updated = await updateImage(db(), a.id, { visible: false, altDe: "Einlauf", altEn: "Walk-on" });
    expect(updated).toMatchObject({ visible: false, altDe: "Einlauf", altEn: "Walk-on" });
    await expect(updateImage(db(), crypto.randomUUID(), { visible: true })).rejects.toMatchObject({ status: 404 });
  });

  it("reorders a category and rejects incomplete or foreign id lists", async () => {
    const a = await addImage();
    const b = await addImage();
    const c = await addImage();
    await reorder(db(), "floorball", [c.id, a.id, b.id]);
    expect((await listByCategory(db(), "floorball")).map((i) => i.id)).toEqual([c.id, a.id, b.id]);

    const stranger = await addImage("studio");
    for (const ids of [[a.id, b.id], [a.id, b.id, c.id, c.id], [a.id, b.id, stranger.id]]) {
      await expect(reorder(db(), "floorball", ids)).rejects.toBeInstanceOf(PortfolioError);
    }
  });

  it("keeps exactly one chapter image per category", async () => {
    const a = await addImage();
    const b = await addImage();
    const studio = await addImage("studio");
    await setRole(db(), a.id, "chapter");
    await setRole(db(), studio.id, "chapter");
    await setRole(db(), b.id, "chapter");
    const roles = Object.fromEntries((await db().select().from(portfolioImages)).map((i) => [i.id, i.role]));
    expect(roles).toEqual({ [a.id]: null, [b.id]: "chapter", [studio.id]: "chapter" });
  });

  it(`allows at most ${MAX_HERO} hero images across all categories`, async () => {
    const images = [await addImage("floorball"), await addImage("studio"), await addImage("fussball"), await addImage("volleyball")];
    for (const image of images.slice(0, MAX_HERO)) await setRole(db(), image.id, "hero");
    await expect(setRole(db(), images[3].id, "hero")).rejects.toThrow(`Maximal ${MAX_HERO} Hero-Bilder.`);
    await expect(setRole(db(), images[0].id, "hero")).resolves.toMatchObject({ role: "hero" });
  });

  it(`allows at most ${MAX_CHAPTER_PREVIEW} chapter previews per category`, async () => {
    const images = [];
    for (let i = 0; i <= MAX_CHAPTER_PREVIEW; i++) images.push(await addImage());
    for (const image of images.slice(0, MAX_CHAPTER_PREVIEW)) await setRole(db(), image.id, "chapter_preview");
    await expect(setRole(db(), images[MAX_CHAPTER_PREVIEW].id, "chapter_preview")).rejects.toThrow(
      `Maximal ${MAX_CHAPTER_PREVIEW} Kapitel-Vorschaubilder pro Kategorie.`,
    );
    const other = await addImage("studio");
    await expect(setRole(db(), other.id, "chapter_preview")).resolves.toMatchObject({ role: "chapter_preview" });
  });

  it("clears a role with null", async () => {
    const a = await addImage();
    await setRole(db(), a.id, "hero");
    expect(await setRole(db(), a.id, null)).toMatchObject({ role: null });
  });

  it("deletes the row and all three sizes in R2", async () => {
    const a = await addImage();
    await deleteImage(db(), env.MEDIA, a.id);
    expect(await db().select().from(portfolioImages).where(eq(portfolioImages.id, a.id))).toHaveLength(0);
    for (const size of IMAGE_SIZES) expect(await env.MEDIA.head(mediaKey("portfolio", a.id, size))).toBeNull();
    await expect(deleteImage(db(), env.MEDIA, a.id)).rejects.toMatchObject({ status: 404 });
  });
});
