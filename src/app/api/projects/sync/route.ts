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
    // Dedup absichtlich global: driveFileId ist UNIQUE über alle Bilder
    // (auch Alt-Bestände ohne projectId) — ein erneuter Insert würde crashen.
    const existing = await db.select({ driveFileId: images.driveFileId }).from(images);
    const existingIds = new Set(existing.map((img) => img.driveFileId));

    const projectImages = await db
      .select({ sortOrder: images.sortOrder })
      .from(images)
      .where(eq(images.projectId, projectId));
    const maxOrder = projectImages.reduce((max, img) => Math.max(max, img.sortOrder), 0);

    let added = 0;
    for (const file of driveFiles) {
      if (!existingIds.has(file.id)) {
        added++;
        await db.insert(images).values({
          driveFileId: file.id,
          projectId,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: maxOrder + added,
        });
      }
    }

    return NextResponse.json({ synced: added, total: driveFiles.length });
  } catch (error) {
    console.error("Project sync error:", error);
    return NextResponse.json({ error: "Sync fehlgeschlagen — Drive-Ordner-ID prüfen" }, { status: 500 });
  }
}
