import { adminApiGuard } from "@/lib/auth/admin";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { isImageSize, isMediaKind, isUuid, mediaKey } from "@/lib/media/keys";
import { sniffImageType } from "@/lib/media/sniff";

const MAX_BYTES = 10 * 1024 * 1024;
const TOO_LARGE = "Datei zu groß (max. 10 MB).";

type Params = { params: Promise<{ kind: string; id: string; size: string }> };

export async function PUT(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;

  const { kind, id, size } = await params;
  const width = Number(size);
  if (!isMediaKind(kind) || !isUuid(id) || String(width) !== size || !isImageSize(width)) {
    return jsonError("Ungültiger Speicherort.", 400);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return jsonError(TOO_LARGE, 413);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return jsonError(TOO_LARGE, 413);
  const type = sniffImageType(bytes);
  if (!type || type !== request.headers.get("content-type")) return jsonError("Nur WebP- oder JPEG-Bilder.", 415);

  await getEnv().MEDIA.put(mediaKey(kind, id, width), bytes, { httpMetadata: { contentType: type } });
  return new Response(null, { status: 204 });
}
