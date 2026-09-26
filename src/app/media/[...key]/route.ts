import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getEnv } from "@/lib/env";
import { BROWSER_CACHE_CONTROL, cachedMedia, edgeCache } from "@/lib/media/edge-cache";
import { parseMediaKey } from "@/lib/media/keys";

type Params = { params: Promise<{ key: string[] }> };

/** Öffentliche Bilder (Portfolio, Porträt). Schlüssel enthalten eine UUID → unveränderlich, aus dem Edge-Cache. */
export async function GET(request: Request, { params }: Params) {
  const key = parseMediaKey((await params).key);
  if (!key) return new Response("Not found", { status: 404 });
  const { ctx } = getCloudflareContext();
  return cachedMedia(request, edgeCache(), (promise) => ctx.waitUntil(promise), async () => {
    const object = await getEnv().MEDIA.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
        "cache-control": BROWSER_CACHE_CONTROL,
        etag: object.httpEtag,
      },
    });
  });
}
