import { NextRequest, NextResponse } from "next/server";
import { getDriveImageBuffer } from "@/lib/drive";

export async function GET(
  _request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const buffer = await getDriveImageBuffer(params.fileId);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      },
    });
  } catch (error) {
    console.error("Drive file fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
