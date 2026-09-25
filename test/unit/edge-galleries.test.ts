import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken } from "@/lib/auth/session";
import { createDb } from "@/lib/db/client";
import { galleries } from "@/lib/db/schema";
import { MAX_ORIGINAL_BYTES, handleGalleryEdge } from "@/edge/galleries";
import { galleryKey } from "@/lib/galleries/keys";
import { addFavorite, createGallery, listEvents, listImages, setGalleryPassword, updateGallery, type Gallery } from "@/lib/galleries/repo";
import { GALLERY_COOKIE, VISITOR_COOKIE, createGalleryToken } from "@/lib/galleries/token";
import { crc32 } from "@/lib/zip/crc32";

const SESSION_SECRET = "admin-session-secret-mit-mindestens-32-zeichen";
const GALLERY_SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const edgeEnv = () => ({ DB: env.DB, GALLERIES: env.GALLERIES, SESSION_SECRET, GALLERY_SECRET });
const db = () => createDb(env.DB);
const now = () => Math.floor(Date.now() / 1000);
const JPEG = (n: number) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); for (let i = 4; i < n; i++) b[i] = i % 251; return b; };
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);

function context() {
  const waits: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException() {} } as unknown as ExecutionContext, settle: () => Promise.all(waits) };
}

async function call(path: string, init: RequestInit = {}) {
  const { ctx, settle } = context();
  const response = await handleGalleryEdge(new Request(`https://cosmo.test${path}`, init), edgeEnv(), ctx);
  await settle();
  return response;
}

async function adminCookie() {
  return `cosmo_admin=${await createSessionToken(SESSION_SECRET, now())}`;
}

async function galleryCookie(gallery: Gallery, visitor?: string) {
  const token = await createGalleryToken(GALLERY_SECRET, gallery, now());
  return `${GALLERY_COOKIE}=${token}${visitor ? `; ${VISITOR_COOKIE}=${encodeURIComponent(visitor)}` : ""}`;
}

async function uploadImage(gallery: Gallery, filename: string, content = JPEG(5000)) {
  const id = crypto.randomUUID();
  const cookie = await adminCookie();
  for (const variant of ["thumb", "preview"]) {
    const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/${variant}`, { method: "PUT", body: WEBP, headers: { cookie, "content-type": "image/webp", "content-length": String(WEBP.length) } });
    expect(res?.status).toBe(204);
  }
  const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
    method: "PUT",
    body: content,
    headers: { cookie, "content-type": "image/jpeg", "content-length": String(content.length), "x-file-name": encodeURIComponent(filename), "x-width": "6000", "x-height": "4000", "x-color": "#202020" },
  });
  return { id, res: res! };
}

let gallery: Gallery;

beforeEach(async () => {
  await db().delete(galleries);
  ({ gallery } = await createGallery(db(), GALLERY_SECRET, { title: "Edge Test" }, new Date()));
  gallery = await updateGallery(db(), gallery.id, { status: "online" });
});

describe("routing", () => {
  it("ignores everything that is not a gallery file route", async () => {
    expect(await call("/")).toBeNull();
    expect(await call("/admin/api/portfolio")).toBeNull();
    expect(await call("/g/edge-test")).toBeNull();
  });
});

describe("admin uploads", () => {
  it("stores the original, computes CRC32 and size on the server and registers the image", async () => {
    const content = JPEG(40_000);
    const { id, res } = await uploadImage(gallery, "Hochzeit Müller 001.jpg", content);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id, filename: "Hochzeit Müller 001.jpg", bytes: 40_000, crc32: crc32(content), width: 6000, height: 4000 });
    expect((await env.GALLERIES.head(galleryKey(gallery.id, id, "original")))?.size).toBe(40_000);
  });

  it("rejects uploads without admin session or from foreign origins", async () => {
    const id = crypto.randomUUID();
    const path = `/admin/api/galleries/${gallery.id}/images/${id}/thumb`;
    expect((await call(path, { method: "PUT", body: WEBP, headers: { "content-type": "image/webp" } }))?.status).toBe(401);
    const res = await call(path, { method: "PUT", body: WEBP, headers: { cookie: await adminCookie(), origin: "https://evil.example", "content-type": "image/webp" } });
    expect(res?.status).toBe(403);
  });

  it("rejects disguised files, oversized or unsized originals and unknown galleries without leaving files", async () => {
    const cookie = await adminCookie();
    const id = crypto.randomUUID();
    const original = (body: Uint8Array, extra: Record<string, string> = {}) =>
      call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
        method: "PUT",
        body,
        headers: { cookie, "content-type": "image/jpeg", "content-length": String(body.length), "x-file-name": "a.jpg", "x-width": "1", "x-height": "1", "x-color": "#000000", ...extra },
      });
    const fake = new TextEncoder().encode("<html>kein jpeg</html>");
    expect((await original(fake))?.status).toBe(415);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, id, "original"))).toBeNull();
    expect((await original(JPEG(10), { "content-length": String(MAX_ORIGINAL_BYTES + 1) }))?.status).toBe(413);
    expect((await original(JPEG(10), { "x-width": "abc" }))?.status).toBe(400);
    const missing = await call(`/admin/api/galleries/${crypto.randomUUID()}/images/${id}/thumb`, { method: "PUT", body: WEBP, headers: { cookie, "content-type": "image/webp" } });
    expect(missing?.status).toBe(404);
  });

  it("refuses the original when thumb or preview are missing (interrupted upload) and removes it again", async () => {
    const cookie = await adminCookie();
    const id = crypto.randomUUID();
    const body = JPEG(100);
    const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
      method: "PUT",
      body,
      headers: { cookie, "content-type": "image/jpeg", "content-length": "100", "x-file-name": "a.jpg", "x-width": "1", "x-height": "1", "x-color": "#000000" },
    });
    expect(res?.status).toBe(400);
    expect(await listImages(db(), gallery.id)).toHaveLength(0);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, id, "original"))).toBeNull();
  });
});

describe("gallery files", () => {
  it("serves files only with this gallery's cookie and logs original downloads with the visitor name", async () => {
    const { id } = await uploadImage(gallery, "IMG_1.jpg");
    const path = `/g/${gallery.slug}/img/${id}`;
    expect((await call(`${path}/thumb`))?.status).toBe(401);

    const { gallery: other } = await createGallery(db(), GALLERY_SECRET, { title: "Andere" }, new Date());
    expect((await call(`${path}/thumb`, { headers: { cookie: await galleryCookie(other) } }))?.status).toBe(401);

    const cookie = await galleryCookie(gallery, "Anna");
    const thumb = await call(`${path}/thumb`, { headers: { cookie } });
    expect(thumb?.status).toBe(200);
    expect(thumb?.headers.get("cache-control")).toBe("private, max-age=3600");

    const original = await call(`${path}/original`, { headers: { cookie } });
    expect(original?.status).toBe(200);
    expect(original?.headers.get("content-disposition")).toBe(`attachment; filename="IMG_1.jpg"; filename*=UTF-8''IMG_1.jpg`);
    await original?.arrayBuffer();
    const events = await listEvents(db(), gallery.id);
    expect(events[0]).toMatchObject({ type: "download_image", imageId: id, visitorName: "Anna" });
  });

  it("hides drafts, reports expiry and rejects images from other galleries", async () => {
    const { id } = await uploadImage(gallery, "a.jpg");
    const cookie = await galleryCookie(gallery);
    const { gallery: other } = await createGallery(db(), GALLERY_SECRET, { title: "Fremd" }, new Date());
    expect((await call(`/g/${gallery.slug}/img/${crypto.randomUUID()}/thumb`, { headers: { cookie } }))?.status).toBe(404);
    expect((await call(`/g/${other.slug}/img/${id}/thumb`, { headers: { cookie: await galleryCookie(other) } }))?.status).toBe(404);

    await updateGallery(db(), gallery.id, { expiresAt: "2020-01-01T00:00:00.000Z" });
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(410);
    await updateGallery(db(), gallery.id, { status: "draft", expiresAt: null });
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(404);
  });

  it("locks out old cookies after a password change", async () => {
    const { id } = await uploadImage(gallery, "a.jpg");
    const cookie = await galleryCookie(gallery);
    await setGalleryPassword(db(), GALLERY_SECRET, gallery.id, "ganz-neues-passwort");
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(401);
  });
});

describe("zip downloads", () => {
  it("streams all images with exact Content-Length, unique names and correct CRCs", async () => {
    const a = JPEG(3000);
    const b = JPEG(4000);
    await uploadImage(gallery, "same.jpg", a);
    await uploadImage(gallery, "same.jpg", b);
    const res = await call(`/g/${gallery.slug}/zip?set=all`, { headers: { cookie: await galleryCookie(gallery, "Tom") } });
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toBe("application/zip");
    expect(res?.headers.get("content-disposition")).toBe(`attachment; filename="Cosmo-Photos_${gallery.slug}.zip"`);
    const zip = new Uint8Array(await res!.arrayBuffer());
    expect(zip.length).toBe(Number(res?.headers.get("content-length")));
    const text = new TextDecoder("latin1").decode(zip);
    expect(text).toContain("same.jpg");
    expect(text).toContain("same (2).jpg");
    expect((await listEvents(db(), gallery.id))[0]).toMatchObject({ type: "download_zip", zipPart: 1, visitorName: "Tom" });
  });

  it("zips only the visitor's favorites and validates set and part", async () => {
    const { id } = await uploadImage(gallery, "fav.jpg");
    await uploadImage(gallery, "other.jpg");
    await addFavorite(db(), gallery.id, id, "Anna");
    const res = await call(`/g/${gallery.slug}/zip?set=favorites`, { headers: { cookie: await galleryCookie(gallery, "Anna") } });
    expect(res?.headers.get("content-disposition")).toContain("_Favoriten.zip");
    const zip = new TextDecoder("latin1").decode(new Uint8Array(await res!.arrayBuffer()));
    expect(zip).toContain("fav.jpg");
    expect(zip).not.toContain("other.jpg");

    expect((await call(`/g/${gallery.slug}/zip?set=favorites`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(400);
    expect((await call(`/g/${gallery.slug}/zip?set=all&part=2`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(404);
    expect((await call(`/g/${gallery.slug}/zip?set=quatsch`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(400);
  });
});
