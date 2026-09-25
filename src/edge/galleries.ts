// Galerie-Dateien laufen direkt im Worker (vor Next): Originale streamen ohne Puffer,
// ZIP mit exakter Länge, Zugriff nur mit gültigem Galerie- bzw. Admin-Cookie.
import { sameHost } from "@/lib/auth/origin";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { readCookie } from "@/lib/cookies";
import { createDb, type Db } from "@/lib/db/client";
import { GALLERY_VARIANTS, galleryKey, type GalleryVariant } from "@/lib/galleries/keys";
import {
  GalleryError,
  addImage,
  getGalleryById,
  getGalleryBySlug,
  getImage,
  galleryState,
  listFavoriteIds,
  listImages,
  logEvent,
  normalizeVisitorName,
  type Gallery,
  type GalleryImage,
} from "@/lib/galleries/repo";
import { GALLERY_COOKIE, VISITOR_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";
import { isUuid } from "@/lib/media/keys";
import { sniffImageType } from "@/lib/media/sniff";
import { CRC32_START, crc32Finish, crc32Update } from "@/lib/zip/crc32";
import { zipPartsFor, zipStream, type ZipEntry } from "@/lib/zip/zip";

export type EdgeEnv = { DB: D1Database; GALLERIES: R2Bucket; SESSION_SECRET: string; GALLERY_SECRET: string };

/** Cloudflare begrenzt Requests auf 100 MB; etwas Luft für Header. */
export const MAX_ORIGINAL_BYTES = 95 * 1024 * 1024;
const MAX_VARIANT_BYTES = 10 * 1024 * 1024;

const ADMIN_FILE = /^\/admin\/api\/galleries\/([^/]+)\/images\/([^/]+)\/(thumb|preview|original)$/;
const GALLERY_FILE = /^\/g\/([a-z0-9-]{1,60})\/img\/([^/]+)\/(thumb|preview|original)$/;
const GALLERY_ZIP = /^\/g\/([a-z0-9-]{1,60})\/zip$/;

const json = (body: unknown, status: number) => Response.json(body, { status });
const error = (message: string, status: number) => json({ error: message }, status);
const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function handleGalleryEdge(request: Request, env: EdgeEnv, ctx: ExecutionContext): Promise<Response | null> {
  const { pathname, searchParams } = new URL(request.url);
  let match = pathname.match(ADMIN_FILE);
  if (match) return adminFile(request, env, match[1], match[2], match[3] as GalleryVariant);
  match = pathname.match(GALLERY_FILE);
  if (match && request.method === "GET") return galleryFile(request, env, ctx, match[1], match[2], match[3] as GalleryVariant);
  match = pathname.match(GALLERY_ZIP);
  if (match && request.method === "GET") return galleryZip(request, env, ctx, match[1], searchParams);
  return null;
}

// ---------- Admin ----------

async function adminFile(request: Request, env: EdgeEnv, galleryId: string, imageId: string, variant: GalleryVariant): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) return error("Anfrage von fremder Herkunft.", 403);
  if (!(await verifySessionToken(readCookie(request, ADMIN_COOKIE), env.SESSION_SECRET, nowSeconds()))) return error("Nicht angemeldet.", 401);
  if (!isUuid(galleryId) || !isUuid(imageId)) return error("Nicht gefunden.", 404);
  const db = createDb(env.DB);
  if (!(await getGalleryById(db, galleryId))) return error("Galerie nicht gefunden.", 404);
  const key = galleryKey(galleryId, imageId, variant);

  if (request.method === "GET" && variant !== "original") return serveObject(env.GALLERIES, key, { "cache-control": "private, max-age=3600" });
  if (request.method !== "PUT") return error("Methode nicht erlaubt.", 405);
  if (variant === "original") return uploadOriginal(request, env, db, galleryId, imageId);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_VARIANT_BYTES) return error("Datei zu groß (max. 10 MB).", 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_VARIANT_BYTES) return error("Datei zu groß (max. 10 MB).", 413);
  const type = sniffImageType(bytes);
  if (!type || type !== request.headers.get("content-type")) return error("Nur WebP- oder JPEG-Bilder.", 415);
  await env.GALLERIES.put(key, bytes, { httpMetadata: { contentType: type } });
  return new Response(null, { status: 204 });
}

function imageHeaders(request: Request): { filename: string; width: number; height: number; color: string } | null {
  let filename: string;
  try {
    filename = decodeURIComponent(request.headers.get("x-file-name") ?? "").trim();
  } catch {
    return null;
  }
  const width = Number(request.headers.get("x-width"));
  const height = Number(request.headers.get("x-height"));
  const color = request.headers.get("x-color") ?? "";
  const valid =
    filename.length > 0 && filename.length <= 200 && !/[/\\]/.test(filename) &&
    Number.isInteger(width) && width > 0 && width <= 30000 &&
    Number.isInteger(height) && height > 0 && height <= 30000 &&
    /^#[0-9a-f]{6}$/i.test(color);
  return valid ? { filename, width, height, color } : null;
}

/**
 * Zählt beim Durchreichen mit: CRC32, Länge und die ersten Bytes (Typprüfung).
 * Ein einziger Datenweg (kein tee): Ein 95-MB-Original wird nie komplett im Speicher gehalten (Worker-Limit 128 MB).
 */
function meter() {
  const result = { crc32: CRC32_START, bytes: 0, head: new Uint8Array(12) };
  const stream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (result.bytes < result.head.length) result.head.set(chunk.subarray(0, result.head.length - result.bytes), result.bytes);
      result.crc32 = crc32Update(result.crc32, chunk);
      result.bytes += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  return { stream, result };
}

/**
 * Nach jeder Ablehnung aufräumen – aber nur, wenn das Bild nicht registriert ist: Vorschau und Web-Größe liegen
 * dann schon im Bucket und würden sonst verwaisen. Ein fehlgeschlagener Wiederholungsversuch darf ein fertiges
 * Bild nicht zerstören (ein abgebrochenes R2-put ersetzt das vorhandene Objekt nicht).
 */
async function uploadOriginal(request: Request, env: EdgeEnv, db: Db, galleryId: string, imageId: string): Promise<Response> {
  const response = await storeOriginal(request, env, db, galleryId, imageId);
  if (response.status >= 400 && !(await getImage(db, galleryId, imageId))) {
    await env.GALLERIES.delete(GALLERY_VARIANTS.map((variant) => galleryKey(galleryId, imageId, variant)));
  }
  return response;
}

async function storeOriginal(request: Request, env: EdgeEnv, db: Db, galleryId: string, imageId: string): Promise<Response> {
  const length = Number(request.headers.get("content-length"));
  if (!Number.isInteger(length) || length <= 0) return error("Dateigröße fehlt.", 411);
  if (length > MAX_ORIGINAL_BYTES) return error("Original zu groß (max. 95 MB).", 413);
  const meta = imageHeaders(request);
  if (!meta || !request.body) return error("Bildangaben fehlen oder sind ungültig.", 400);

  const counted = meter();
  // FixedLengthStream: R2 braucht die Länge vorab; stimmt sie nicht, schlägt der Upload fehl.
  const fixed = new FixedLengthStream(length);
  try {
    await Promise.all([
      request.body.pipeThrough(counted.stream).pipeTo(fixed.writable),
      env.GALLERIES.put(galleryKey(galleryId, imageId, "original"), fixed.readable, { httpMetadata: { contentType: "image/jpeg" } }),
    ]);
  } catch {
    return error("Upload abgebrochen oder unvollständig.", 400);
  }
  const head = counted.result.head.subarray(0, Math.min(counted.result.bytes, counted.result.head.length));
  if (counted.result.bytes !== length) return error("Upload unvollständig.", 400);
  if (sniffImageType(head) !== "image/jpeg") return error("Nur JPEG-Originale.", 415);
  try {
    const image = await addImage(db, env.GALLERIES, {
      id: imageId,
      galleryId,
      ...meta,
      bytes: counted.result.bytes,
      crc32: crc32Finish(counted.result.crc32),
    });
    return json(image, 201);
  } catch (cause) {
    if (cause instanceof GalleryError) return error(cause.message, cause.status);
    throw cause;
  }
}

// ---------- Kunden ----------

type Access = { gallery: Gallery; db: Db; visitor: string | null } | { response: Response };

async function galleryAccess(request: Request, env: EdgeEnv, slug: string): Promise<Access> {
  const db = createDb(env.DB);
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery) return { response: error("Galerie nicht gefunden.", 404) };
  const state = galleryState(gallery, new Date());
  if (state === "draft") return { response: error("Galerie nicht gefunden.", 404) };
  if (state === "expired") return { response: error("Galerie abgelaufen.", 410) };
  if (!(await verifyGalleryToken(readCookie(request, GALLERY_COOKIE), env.GALLERY_SECRET, gallery, nowSeconds()))) {
    return { response: error("Kein Zugang.", 401) };
  }
  return { gallery, db, visitor: normalizeVisitorName(readCookie(request, VISITOR_COOKIE)) };
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function serveObject(bucket: R2Bucket, key: string, headers: Record<string, string>): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) return error("Nicht gefunden.", 404);
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "content-length": String(object.size),
      etag: object.httpEtag,
      "x-robots-tag": "noindex, nofollow",
      ...headers,
    },
  });
}

async function galleryFile(request: Request, env: EdgeEnv, ctx: ExecutionContext, slug: string, imageId: string, variant: GalleryVariant): Promise<Response> {
  const access = await galleryAccess(request, env, slug);
  if ("response" in access) return access.response;
  const { gallery, db, visitor } = access;
  const image = isUuid(imageId) ? await getImage(db, gallery.id, imageId) : undefined;
  if (!image) return error("Bild nicht gefunden.", 404);
  const key = galleryKey(gallery.id, image.id, variant);
  if (variant !== "original") return serveObject(env.GALLERIES, key, { "cache-control": "private, max-age=3600" });
  ctx.waitUntil(logEvent(db, { galleryId: gallery.id, type: "download_image", imageId: image.id, visitorName: visitor }));
  return serveObject(env.GALLERIES, key, { "cache-control": "private, no-store", "content-disposition": contentDisposition(image.filename) });
}

async function galleryZip(request: Request, env: EdgeEnv, ctx: ExecutionContext, slug: string, params: URLSearchParams): Promise<Response> {
  const access = await galleryAccess(request, env, slug);
  if ("response" in access) return access.response;
  const { gallery, db, visitor } = access;

  const set = params.get("set") ?? "all";
  if (set !== "all" && set !== "favorites") return error("Unbekannte Auswahl.", 400);
  let images: GalleryImage[] = await listImages(db, gallery.id);
  if (set === "favorites") {
    if (!visitor) return error("Bitte zuerst einen Namen angeben.", 400);
    const ids = new Set(await listFavoriteIds(db, gallery.id, visitor));
    images = images.filter((image) => ids.has(image.id));
  }
  // Dieselbe Aufteilung berechnet die Galerie-Seite für ihre Buttons (gleiche Reihenfolge, gleiche Namen).
  const parts = zipPartsFor(images);
  const partNumber = Number(params.get("part") ?? "1");
  const part = Number.isInteger(partNumber) ? parts[partNumber - 1] : undefined;
  if (!part) return error("Diesen Teil gibt es nicht.", 404);

  const entries: ZipEntry[] = part.files.map(({ item: image, name }) => ({
    name,
    size: image.bytes,
    crc32: image.crc32,
    open: async () => {
      const object = await env.GALLERIES.get(galleryKey(gallery.id, image.id, "original"));
      if (!object) throw new Error(`Original fehlt: ${image.filename}`);
      return object.body;
    },
  }));

  // FixedLengthStream sorgt dafür, dass Cloudflare die Content-Length mitschickt (echter Fortschrittsbalken).
  const fixed = new FixedLengthStream(part.size);
  zipStream(entries).pipeTo(fixed.writable).catch(() => {});
  ctx.waitUntil(logEvent(db, { galleryId: gallery.id, type: "download_zip", zipPart: partNumber, visitorName: visitor }));

  const base = `Cosmo-Photos_${gallery.slug}${set === "favorites" ? "_Favoriten" : ""}`;
  const filename = parts.length > 1 ? `${base}_Teil-${partNumber}-von-${parts.length}.zip` : `${base}.zip`;
  return new Response(fixed.readable, {
    headers: {
      "content-type": "application/zip",
      "content-length": String(part.size),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
