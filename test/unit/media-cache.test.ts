import { describe, expect, it } from "vitest";
import { BROWSER_CACHE_CONTROL, cachedMedia, EDGE_CACHE_CONTROL, purgeMedia } from "@/lib/media/edge-cache";

const IMAGE_HEADERS = { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", etag: '"abc"' };

async function setup() {
  const cache = await caches.open(`media-${crypto.randomUUID()}`);
  const pending: Promise<unknown>[] = [];
  return { cache, pending, waitUntil: (promise: Promise<unknown>) => void pending.push(promise) };
}

describe("cachedMedia", () => {
  it("lädt beim ersten Abruf aus R2, danach aus dem Cache (gleiche Header)", async () => {
    const { cache, pending, waitUntil } = await setup();
    let loads = 0;
    const load = async () => {
      loads++;
      return new Response("bild", { headers: IMAGE_HEADERS });
    };
    const request = new Request("https://cosmo-photos.de/media/portfolio/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/800");
    expect(await (await cachedMedia(request, cache, waitUntil, load)).text()).toBe("bild");
    await Promise.all(pending);
    const second = await cachedMedia(request, cache, waitUntil, load);
    expect(await second.text()).toBe("bild");
    expect(second.headers.get("content-type")).toBe("image/webp");
    expect(second.headers.get("etag")).toBe('"abc"');
    expect(loads).toBe(1);
  });

  it("speichert 404 nie", async () => {
    const { cache, pending, waitUntil } = await setup();
    let loads = 0;
    const load = async () => {
      loads++;
      return new Response("Not found", { status: 404 });
    };
    const request = new Request("https://cosmo-photos.de/media/portfolio/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/1600");
    expect((await cachedMedia(request, cache, waitUntil, load)).status).toBe(404);
    await Promise.all(pending);
    expect((await cachedMedia(request, cache, waitUntil, load)).status).toBe(404);
    expect(loads).toBe(2);
  });

  it("hält Treffer am Rand nur einen Tag, dem Browser gibt er weiter ein Jahr", async () => {
    const { cache, pending, waitUntil } = await setup();
    const request = new Request("https://cosmo-photos.de/media/portfolio/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/2400");
    await cachedMedia(request, cache, waitUntil, async () => new Response("bild", { headers: IMAGE_HEADERS }));
    await Promise.all(pending);
    expect((await cache.match(request))?.headers.get("cache-control")).toBe(EDGE_CACHE_CONTROL);
    const hit = await cachedMedia(request, cache, waitUntil, async () => new Response("neu"));
    expect(hit.headers.get("cache-control")).toBe(BROWSER_CACHE_CONTROL);
    expect(await hit.text()).toBe("bild");
  });

  it("purgeMedia entfernt nach dem Löschen alle drei Größen eines Bildes", async () => {
    const { cache, pending, waitUntil } = await setup();
    const origin = "https://cosmo-photos.de";
    const id = "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d";
    const url = (size: number) => new Request(`${origin}/media/portfolio/${id}/${size}`);
    for (const size of [800, 1600, 2400]) await cachedMedia(url(size), cache, waitUntil, async () => new Response("bild", { headers: IMAGE_HEADERS }));
    await Promise.all(pending);
    await purgeMedia(cache, origin, "portfolio", id);
    for (const size of [800, 1600, 2400]) expect(await cache.match(url(size))).toBeUndefined();
  });
});
