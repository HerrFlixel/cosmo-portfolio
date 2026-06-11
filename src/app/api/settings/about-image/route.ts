import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { uploadFileToDrive } from "@/lib/drive";
import { setSetting } from "@/lib/db/queries";

const MAX_SIZE = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Nur Bilddateien erlaubt" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Datei zu groß (max. 15 MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const driveFileId = await uploadFileToDrive(
      buffer,
      `about-${Date.now()}-${file.name}`,
      file.type
    );

    // visible:false hält das Foto aus allen öffentlichen Galerien heraus;
    // die About-Seite referenziert es direkt über das Setting.
    const inserted = await db
      .insert(images)
      .values({
        driveFileId,
        titleDe: "Über mich",
        titleEn: "About",
        visible: false,
      })
      .returning();

    await setSetting("about_image_id", inserted[0].id);
    return NextResponse.json({ id: inserted[0].id });
  } catch (error) {
    console.error("About image upload error:", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
