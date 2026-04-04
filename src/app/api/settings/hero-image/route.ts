import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFileToDrive } from "@/lib/drive";
import { setSetting } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileId = await uploadFileToDrive(buffer, `hero-${Date.now()}-${file.name}`, file.type);

  await setSetting("hero_image_id", fileId);

  return NextResponse.json({ fileId });
}
