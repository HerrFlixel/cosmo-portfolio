import { NextRequest, NextResponse } from "next/server";
import { verifyAlbumCode } from "@/lib/db/queries";
import { getDriveImageBuffer, listImagesInFolder } from "@/lib/drive";
import { db } from "@/lib/db";
import { albums } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import archiver from "archiver";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  const album = await verifyAlbumCode(code.trim().toUpperCase());
  if (!album) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  await db
    .update(albums)
    .set({ downloadCount: sql`${albums.downloadCount} + 1` })
    .where(eq(albums.id, album.id));

  const files = await listImagesInFolder(album.driveFolderId);

  const archive = archiver("zip", { zlib: { level: 5 } });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", resolve);
    archive.on("error", reject);

    (async () => {
      for (const file of files) {
        try {
          const buffer = await getDriveImageBuffer(file.id);
          archive.append(buffer, { name: file.name });
        } catch (error) {
          console.error(`Failed to fetch file ${file.id}:`, error);
        }
      }
      archive.finalize();
    })();
  });

  const zipBuffer = Buffer.concat(chunks);
  const safeName = album.name.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cosmo-photos-${safeName}.zip"`,
    },
  });
}
