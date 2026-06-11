import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDriveImageBuffer, getDriveThumbnailLink } from "@/lib/drive";

// Drive-Thumbnail-Links laufen nach einigen Stunden ab — daher kurzlebiger
// In-Memory-Cache und kurze Browser-Cache-Zeit auf dem Redirect.
const thumbCache = new Map<string, { link: string; fetchedAt: number }>();
const THUMB_TTL_MS = 30 * 60 * 1000;
const MAX_THUMB_SIZE = 2048;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const image = await db
    .select()
    .from(images)
    .where(eq(images.id, params.id));

  if (!image[0] || !image[0].driveFileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const driveFileId = image[0].driveFileId;
  const w = Number(request.nextUrl.searchParams.get("w")) || 0;

  // Skalierte Varianten kommen von Googles Thumbnail-CDN (lh3) — schnell,
  // korrekt verkleinert, ohne CPU/RAM-Last auf dem eigenen Server.
  if (w > 0) {
    try {
      const cached = thumbCache.get(driveFileId);
      let link =
        cached && Date.now() - cached.fetchedAt < THUMB_TTL_MS ? cached.link : null;
      if (!link) {
        link = await getDriveThumbnailLink(driveFileId);
        if (link) thumbCache.set(driveFileId, { link, fetchedAt: Date.now() });
      }
      if (link) {
        const size = Math.min(w, MAX_THUMB_SIZE);
        const sized = /=s\d+(-c)?$/.test(link)
          ? link.replace(/=s\d+(-c)?$/, `=s${size}`)
          : `${link}=s${size}`;
        return NextResponse.redirect(sized, {
          status: 302,
          headers: { "Cache-Control": "public, max-age=1800" },
        });
      }
    } catch (error) {
      console.error("Thumbnail link error:", error);
      // Fallback unten: Original streamen
    }
  }

  try {
    const buffer = await getDriveImageBuffer(driveFileId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      },
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
