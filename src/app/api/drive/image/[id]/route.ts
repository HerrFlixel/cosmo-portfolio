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
    const buffer = await getDriveImageBuffer(image[0].driveFileId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
