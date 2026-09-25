import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { galleries } from "@/lib/db/schema";
import { galleryKey } from "@/lib/galleries/keys";
import {
  GalleryError,
  addFavorite,
  addImage,
  checkGalleryPassword,
  createGallery,
  deleteGallery,
  extendGallery,
  favoritesByVisitor,
  galleryState,
  getGalleryBySlug,
  listEvents,
  listFavoriteIds,
  listGalleries,
  listImages,
  logEvent,
  normalizeVisitorName,
  removeFavorite,
  removeImage,
  revealPassword,
  setGalleryPassword,
  updateGallery,
} from "@/lib/galleries/repo";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const NOW = new Date("2026-09-25T10:00:00.000Z");
const db = () => createDb(env.DB);

async function storeFiles(galleryId: string, imageId: string, variants = ["thumb", "preview", "original"] as const) {
  for (const variant of variants) await env.GALLERIES.put(galleryKey(galleryId, imageId, variant), new Uint8Array([0xff, 0xd8, 0xff]));
}

async function addTestImage(galleryId: string, filename: string, bytes = 1000) {
  const id = crypto.randomUUID();
  await storeFiles(galleryId, id);
  return addImage(db(), env.GALLERIES, { id, galleryId, filename, bytes, crc32: 0xdeadbeef, width: 6000, height: 4000, color: "#101010" });
}

beforeEach(async () => {
  await db().delete(galleries);
});

describe("galleries", () => {
  it("creates drafts with a unique lowercase slug, a 30-day expiry and a retrievable password", async () => {
    const { gallery, password } = await createGallery(db(), SECRET, { title: "Final4 Zwickau 2026" }, NOW);
    const second = await createGallery(db(), SECRET, { title: "final4 ZWICKAU 2026" }, NOW);
    expect(gallery).toMatchObject({ slug: "final4-zwickau-2026", status: "draft", expiresAt: "2026-10-25T21:59:59.000Z" });
    expect(second.gallery.slug).toBe("final4-zwickau-2026-2");
    expect(password).toMatch(/^[a-z]+-[a-z]+-\d\d$/);
    expect(await revealPassword(SECRET, gallery)).toBe(password);
    expect(await checkGalleryPassword(gallery, password)).toBe(true);
    expect(await checkGalleryPassword(gallery, "falsch-falsch-00")).toBe(false);
  });

  it("accepts a pasted password with surrounding whitespace", async () => {
    const { gallery, password } = await createGallery(db(), SECRET, { title: "Leerzeichen" }, NOW);
    expect(await checkGalleryPassword(gallery, ` ${password}\n`)).toBe(true);
  });

  it("knows draft, online and expired", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Zustand" }, NOW);
    expect(galleryState(gallery, NOW)).toBe("draft");
    const online = await updateGallery(db(), gallery.id, { status: "online" });
    expect(galleryState(online, NOW)).toBe("online");
    // „Online bis 25.10.“ gilt bis zum Ende des Tages (Berlin), nicht bis zur Uhrzeit der Erstellung.
    expect(galleryState(online, new Date("2026-10-25T20:00:00.000Z"))).toBe("online");
    expect(galleryState(online, new Date("2026-10-25T21:59:59.000Z"))).toBe("expired");
    const unlimited = await updateGallery(db(), gallery.id, { expiresAt: null });
    expect(galleryState(unlimited, new Date("2030-01-01T00:00:00.000Z"))).toBe("online");
  });

  it("validates slugs and keeps them unique", async () => {
    const a = await createGallery(db(), SECRET, { title: "A" }, NOW);
    const b = await createGallery(db(), SECRET, { title: "B" }, NOW);
    await expect(updateGallery(db(), b.gallery.id, { slug: a.gallery.slug })).rejects.toMatchObject({ status: 409 });
    await expect(updateGallery(db(), b.gallery.id, { slug: "Ungültig Slug" })).rejects.toBeInstanceOf(GalleryError);
  });

  it("changes the password and updates updated_at", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Passwort" }, NOW);
    const changed = await setGalleryPassword(db(), SECRET, gallery.id, "neues-passwort");
    expect(await checkGalleryPassword(changed, "neues-passwort")).toBe(true);
    expect(await revealPassword(SECRET, changed)).toBe("neues-passwort");
    expect(changed.updatedAt >= gallery.updatedAt).toBe(true);
    await expect(setGalleryPassword(db(), SECRET, gallery.id, "kurz")).rejects.toMatchObject({ status: 400 });
  });

  it("extends by 30 days from the later of now and the current expiry", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Verlängern" }, NOW);
    expect((await extendGallery(db(), gallery.id, NOW)).expiresAt).toBe("2026-11-24T21:59:59.000Z");
    const late = new Date("2027-01-01T00:00:00.000Z");
    expect((await extendGallery(db(), gallery.id, late)).expiresAt).toBe("2027-01-31T21:59:59.000Z");
  });
});

describe("gallery images", () => {
  it("only registers images whose three files exist, sorted by filename", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Bilder" }, NOW);
    await addTestImage(gallery.id, "img_0002.jpg");
    await addTestImage(gallery.id, "IMG_0001.jpg");
    expect((await listImages(db(), gallery.id)).map((i) => i.filename)).toEqual(["IMG_0001.jpg", "img_0002.jpg"]);

    const id = crypto.randomUUID();
    await storeFiles(gallery.id, id, ["thumb", "original"]);
    await expect(
      addImage(db(), env.GALLERIES, { id, galleryId: gallery.id, filename: "x.jpg", bytes: 1, crc32: 1, width: 1, height: 1, color: "#000000" }),
    ).rejects.toThrow("Upload unvollständig: Vorschau, Web-Größe und Original müssen vorhanden sein.");
  });

  it("updates instead of failing when the same image is registered again (retried upload)", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Wiederholung" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg", 1000);
    const retry = { id: image.id, galleryId: gallery.id, filename: "a.jpg", bytes: 2000, crc32: 7, width: 6000, height: 4000, color: "#101010" };
    expect(await addImage(db(), env.GALLERIES, retry)).toMatchObject({ id: image.id, bytes: 2000, crc32: 7 });
    expect(await listImages(db(), gallery.id)).toHaveLength(1);

    const { gallery: other } = await createGallery(db(), SECRET, { title: "Fremd" }, NOW);
    await storeFiles(other.id, image.id);
    await expect(addImage(db(), env.GALLERIES, { ...retry, galleryId: other.id })).rejects.toMatchObject({ status: 409 });
  });

  it("orders identical filenames by id so ZIP parts stay stable between requests", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Gleiche Namen" }, NOW);
    const ids = ["ffffffff-0000-4000-8000-000000000000", "00000000-0000-4000-8000-000000000000"];
    for (const id of ids) {
      await storeFiles(gallery.id, id);
      await addImage(db(), env.GALLERIES, { id, galleryId: gallery.id, filename: "DSC_0001.jpg", bytes: 1, crc32: 1, width: 1, height: 1, color: "#000000" });
    }
    expect((await listImages(db(), gallery.id)).map((image) => image.id)).toEqual([...ids].reverse());
  });

  it("removes an image with its files and clears it as cover", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Entfernen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await updateGallery(db(), gallery.id, { coverImageId: image.id });
    await removeImage(db(), env.GALLERIES, gallery.id, image.id);
    expect(await listImages(db(), gallery.id)).toHaveLength(0);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, image.id, "original"))).toBeNull();
    expect((await getGalleryBySlug(db(), gallery.slug))?.coverImageId).toBeNull();
  });

  it("deletes a gallery with all files, favorites and events", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Löschen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await addFavorite(db(), gallery.id, image.id, "Anna");
    await logEvent(db(), { galleryId: gallery.id, type: "view" });
    await deleteGallery(db(), env.GALLERIES, gallery.id);
    expect(await getGalleryBySlug(db(), gallery.slug)).toBeUndefined();
    expect((await env.GALLERIES.list({ prefix: `${gallery.id}/` })).objects).toHaveLength(0);
    expect(await listEvents(db(), gallery.id)).toHaveLength(0);
    expect(await listFavoriteIds(db(), gallery.id, "Anna")).toHaveLength(0);
  });
});

describe("favorites, events and list", () => {
  it("normalizes visitor names", () => {
    expect(normalizeVisitorName("  Anna  ")).toBe("Anna");
    expect(normalizeVisitorName("Tom 🏑")).toBe("Tom 🏑");
    expect(normalizeVisitorName("")).toBeNull();
    expect(normalizeVisitorName("   ")).toBeNull();
    expect(normalizeVisitorName("x".repeat(41))).toBeNull();
    expect(normalizeVisitorName(42)).toBeNull();
  });

  it("keeps favorites per visitor and ignores duplicates", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Favoriten" }, NOW);
    const a = await addTestImage(gallery.id, "a.jpg");
    const b = await addTestImage(gallery.id, "b.jpg");
    await addFavorite(db(), gallery.id, a.id, "Anna");
    await addFavorite(db(), gallery.id, a.id, "Anna");
    await addFavorite(db(), gallery.id, b.id, "Anna");
    await addFavorite(db(), gallery.id, a.id, "anna");
    await removeFavorite(db(), gallery.id, b.id, "Anna");
    expect(await listFavoriteIds(db(), gallery.id, "Anna")).toEqual([a.id]);
    expect(await listFavoriteIds(db(), gallery.id, "anna")).toEqual([a.id]);
    const byVisitor = await favoritesByVisitor(db(), gallery.id);
    expect(byVisitor.map((v) => [v.visitorName, v.images.map((i) => i.filename)])).toEqual([
      ["Anna", ["a.jpg"]],
      ["anna", ["a.jpg"]],
    ]);
    await expect(addFavorite(db(), gallery.id, crypto.randomUUID(), "Anna")).rejects.toMatchObject({ status: 404 });
  });

  it("counts images, views, downloads and favorites per gallery", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Zahlen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await logEvent(db(), { galleryId: gallery.id, type: "view" });
    await logEvent(db(), { galleryId: gallery.id, type: "view", visitorName: "Anna" });
    await logEvent(db(), { galleryId: gallery.id, type: "download_image", imageId: image.id });
    await logEvent(db(), { galleryId: gallery.id, type: "download_zip", zipPart: 1 });
    await addFavorite(db(), gallery.id, image.id, "Anna");
    const [item] = await listGalleries(db());
    expect(item).toMatchObject({ id: gallery.id, imageCount: 1, views: 2, downloads: 2, favorites: 1 });
    const events = await listEvents(db(), gallery.id);
    expect(events.map((e) => e.type)).toEqual(["download_zip", "download_image", "view", "view"]);
  });
});
