import { getEnv } from "@/lib/env";
import { parseMediaKey } from "@/lib/media/keys";

type Params = { params: Promise<{ key: string[] }> };

/** Öffentliche Bilder (Portfolio, Porträt). Schlüssel enthalten eine UUID → unveränderlich cachebar. */
export async function GET(_request: Request, { params }: Params) {
  const key = parseMediaKey((await params).key);
  if (!key) return new Response("Not found", { status: 404 });
  const object = await getEnv().MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      etag: object.httpEtag,
    },
  });
}
