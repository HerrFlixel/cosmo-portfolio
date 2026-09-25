import { cookies } from "next/headers";
import { z } from "zod";
import { sameHost } from "@/lib/auth/origin";
import { getDb } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import {
  GalleryError,
  addFavorite,
  galleryState,
  getGalleryBySlug,
  listFavoriteIds,
  logEvent,
  normalizeVisitorName,
  removeFavorite,
} from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { GALLERY_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.strictObject({ imageId: z.uuid(), name: z.string() });

async function access(slug: string) {
  const db = getDb();
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") return { response: jsonError("Galerie nicht gefunden.", 404) };
  const token = (await cookies()).get(GALLERY_COOKIE)?.value;
  if (!(await verifyGalleryToken(token, gallerySecret(), gallery, Math.floor(Date.now() / 1000)))) {
    return { response: jsonError("Kein Zugang.", 401) };
  }
  return { db, gallery };
}

export async function GET(request: Request, { params }: Params) {
  const result = await access((await params).slug);
  if ("response" in result) return result.response;
  const name = normalizeVisitorName(new URL(request.url).searchParams.get("name"));
  if (!name) return jsonError("Ungültiger Name.", 400);
  return Response.json(await listFavoriteIds(result.db, result.gallery.id, name));
}

async function change(request: Request, { params }: Params, add: boolean) {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) return jsonError("Anfrage von fremder Herkunft.", 403);
  const result = await access((await params).slug);
  if ("response" in result) return result.response;
  const input = await readJson(request, bodySchema);
  if ("response" in input) return input.response;
  const name = normalizeVisitorName(input.data.name);
  if (!name) return jsonError("Ungültiger Name.", 400);
  try {
    if (add) await addFavorite(result.db, result.gallery.id, input.data.imageId, name);
    else await removeFavorite(result.db, result.gallery.id, input.data.imageId, name);
  } catch (cause) {
    if (cause instanceof GalleryError) return jsonError(cause.message, cause.status);
    throw cause;
  }
  await logEvent(result.db, {
    galleryId: result.gallery.id,
    type: add ? "favorite_add" : "favorite_remove",
    imageId: input.data.imageId,
    visitorName: name,
  });
  return new Response(null, { status: 204 });
}

export const POST = (request: Request, context: Params) => change(request, context, true);
export const DELETE = (request: Request, context: Params) => change(request, context, false);
