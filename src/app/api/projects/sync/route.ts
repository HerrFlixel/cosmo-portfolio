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
    // Dedup global: driveFileId ist UNIQUE über alle Bilder. Alt-Bilder ohne
    // Projekt (aus dem früheren flachen Portfolio-Sync) werden adoptiert,
    // Bilder anderer Projekte bleiben unangetastet.
    const existing = await db
      .select({ id: images.id, driveFileId: images.driveFileId, projectId: images.projectId })
      .from(images);
    const byDriveId = new Map(existing.map((img) => [img.driveFileId, img]));

    const projectOrders = await db
      .select({ sortOrder: images.sortOrder })
      .from(images)
      .where(eq(images.projectId, projectId));
    let order = projectOrders.reduce((max, img) => Math.max(max, img.sortOrder), 0);

    let added = 0;
    let adopted = 0;
    for (const file of driveFiles) {
      const known = byDriveId.get(file.id);
      if (!known) {
        order++;
        added++;
        await db.insert(images).values({
          driveFileId: file.id,
          projectId,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: order,
        });
      } else if (!known.projectId) {
        order++;
        adopted++;
        await db
          .update(images)
          .set({ projectId, sortOrder: order, updatedAt: new Date().toISOString() })
          .where(eq(images.id, known.id));
      }
    }

    return NextResponse.json({ synced: added, adopted, total: driveFiles.length });
  } catch (error) {
    console.error("Project sync error:", error);
    const code = (error as { code?: number }).code;
    const message =
      code === 404
        ? "Drive-Ordner nicht gefunden — ID prüfen und Ordner für den Service-Account freigeben"
        : code === 403
          ? "Kein Zugriff auf den Drive-Ordner — Ordner für den Service-Account freigeben"
          : "Sync fehlgeschlagen — Drive-Ordner-ID prüfen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
