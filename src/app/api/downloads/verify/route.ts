import { NextRequest, NextResponse } from "next/server";
import { verifyAlbumCode } from "@/lib/db/queries";
import { listImagesInFolder } from "@/lib/drive";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.lastReset > 60_000) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const album = await verifyAlbumCode(code.trim().toUpperCase());
  if (!album) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  }

  try {
    const files = await listImagesInFolder(album.driveFolderId);
    return NextResponse.json({
      label: album.name,
      images: files.map((f) => ({
        id: f.id,
        name: f.name,
      })),
    });
  } catch (error) {
    console.error("Album folder listing failed:", error);
    return NextResponse.json({ error: "Album-Ordner nicht erreichbar" }, { status: 500 });
  }
}
