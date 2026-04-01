import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listDriveImages } from "@/lib/drive";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const driveFiles = await listDriveImages();
    const existingImages = await db.select().from(images);
    const existingDriveIds = new Set(existingImages.map((img) => img.driveFileId));

    let added = 0;
    const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.sortOrder), 0);

    for (const file of driveFiles) {
      if (!existingDriveIds.has(file.id)) {
        await db.insert(images).values({
          driveFileId: file.id,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: maxOrder + added + 1,
        });
        added++;
      }
    }

    return NextResponse.json({ synced: added, total: driveFiles.length });
  } catch (error) {
    console.error("Drive sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
