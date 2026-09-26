import { IMAGE_SIZES, mediaUrl, type MediaKind } from "./keys";

/** Browser: unveränderlich ein Jahr (Schlüssel mit UUID). */
export const BROWSER_CACHE_CONTROL = "public, max-age=31536000, immutable";
/** Rand: einen Tag. So verschwindet ein gelöschtes Bild auch an Standorten, deren Cache purgeMedia nicht erreicht. */
export const EDGE_CACHE_CONTROL = "public, max-age=86400";

/** Cloudflare-Cache des Standorts. Die DOM-Typen von Next kennen `caches.default` nicht. */
export const edgeCache = () => (caches as unknown as { default: Cache }).default;

/**
 * Öffentliche Bilder aus dem Cloudflare-Cache des Standorts (Plan 6, statt img.cosmo-photos.de). Nur 200er landen im
 * Cache. Auf *.workers.dev ist der Cache wirkungslos (jeder Abruf trifft R2), auf der eigenen Domain greift er.
 * Der Body wird nie gepuffert: clone() teilt den Stream zwischen Antwort und Cache.
 */
export async function cachedMedia(
  request: Request,
  cache: Cache,
  waitUntil: (promise: Promise<unknown>) => void,
  load: () => Promise<Response>,
): Promise<Response> {
  const key = new Request(request.url, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) {
    const response = new Response(hit.body, hit);
    response.headers.set("cache-control", BROWSER_CACHE_CONTROL);
    return response;
  }
  const response = await load();
  if (response.status === 200) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set("cache-control", EDGE_CACHE_CONTROL);
    waitUntil(cache.put(key, stored));
  }
  return response;
}

/** Nach dem Löschen eines Bildes: alle Größen aus dem Cache dieses Standorts (andere Standorte: spätestens nach einem Tag). */
export async function purgeMedia(cache: Cache, origin: string, kind: MediaKind, id: string): Promise<void> {
  await Promise.all(IMAGE_SIZES.map((size) => cache.delete(new Request(new URL(mediaUrl(kind, id, size), origin).toString()))));
}
