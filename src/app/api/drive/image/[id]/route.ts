import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDriveImageBuffer } from "@/lib/drive";

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

  try {
    const rawBuffer = await getDriveImageBuffer(image[0].driveFileId);

    const widthParam = request.nextUrl.searchParams.get("w");
    const maxWidth = widthParam ? parseInt(widthParam, 10) : 1920;

    try {
      const sharp = (await import("sharp")).default;
      const compressed = await sharp(Buffer.from(rawBuffer))
        .resize({ width: Math.min(maxWidth, 1920), withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      return new NextResponse(compressed, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
        },
      });
    } catch {
      // sharp not available — serve raw
      return new NextResponse(new Uint8Array(rawBuffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
