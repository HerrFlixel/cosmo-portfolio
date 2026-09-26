import { adminApiGuard } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { edgeCache, purgeMedia } from "@/lib/media/edge-cache";
import { isUuid } from "@/lib/media/keys";
import { PortfolioError, deleteImage, setRole, updateImage, type PortfolioImage } from "@/lib/portfolio/repo";
import { patchImageSchema } from "@/lib/portfolio/validation";

type Params = { params: Promise<{ id: string }> };

function portfolioErrorResponse(error: unknown): Response {
  if (error instanceof PortfolioError) return jsonError(error.message, error.status);
  throw error;
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bild nicht gefunden.", 404);
  const input = await readJson(request, patchImageSchema);
  if ("response" in input) return input.response;

  const { role, ...fields } = input.data;
  try {
    const db = getDb();
    let row: PortfolioImage | undefined;
    if (Object.keys(fields).length > 0) row = await updateImage(db, id, fields);
    if (role !== undefined) row = await setRole(db, id, role);
    return row ? Response.json(row) : jsonError("Keine Änderung angegeben.", 400);
  } catch (error) {
    return portfolioErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bild nicht gefunden.", 404);
  try {
    await deleteImage(getDb(), getEnv().MEDIA, id);
    // Gelöschte Bilder sofort auch aus dem Edge-Cache dieses Standorts (Plan 6).
    await purgeMedia(edgeCache(), new URL(request.url).origin, "portfolio", id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return portfolioErrorResponse(error);
  }
}
