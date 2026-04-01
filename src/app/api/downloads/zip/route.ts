import { NextRequest, NextResponse } from "next/server";
import { verifyDownloadCode } from "@/lib/db/queries";
import { getDriveImageBuffer } from "@/lib/drive";
import { db } from "@/lib/db";
import { downloadCodes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import archiver from "archiver";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  const result = await verifyDownloadCode(code);
  if (!result) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  // Increment download count
  await db
    .update(downloadCodes)
    .set({ downloadCount: sql`${downloadCodes.downloadCount} + 1` })
    .where(eq(downloadCodes.id, result.id));

  // Create ZIP in memory
  const archive = archiver("zip", { zlib: { level: 5 } });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", resolve);
    archive.on("error", reject);

    (async () => {
      for (const image of result.images) {
        if (image.driveFileId) {
          try {
            const buffer = await getDriveImageBuffer(image.driveFileId);
            const filename = (image.titleDe || image.id) + ".jpg";
            archive.append(buffer, { name: filename });
          } catch (error) {
            console.error(`Failed to fetch image ${image.id}:`, error);
          }
        }
      }
      archive.finalize();
    })();
  });

  const zipBuffer = Buffer.concat(chunks);
  const safeName = result.label.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cosmo-photos-${safeName}.zip"`,
    },
  });
}
