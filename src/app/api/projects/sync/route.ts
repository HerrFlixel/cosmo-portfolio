import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listImagesInFolder } from "@/lib/drive";
import { db } from "@/lib/db";
import { projects, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await request.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const project = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];
  if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

  try {
    const driveFiles = await listImagesInFolder(project.driveFolderId);
    const existing = await db.select({ driveFileId: images.driveFileId }).from(images);
    const existingIds = new Set(existing.map((img) => img.driveFileId));

    let added = 0;
    for (const file of driveFiles) {
      if (!existingIds.has(file.id)) {
        await db.insert(images).values({
          driveFileId: file.id,
          projectId,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: added + 1,
        });
        added++;
      }
    }

    return NextResponse.json({ synced: added, total: driveFiles.length });
  } catch (error) {
    console.error("Project sync error:", error);
    return NextResponse.json({ error: "Sync fehlgeschlagen — Drive-Ordner-ID prüfen" }, { status: 500 });
  }
}
