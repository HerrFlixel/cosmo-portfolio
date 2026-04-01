import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadCodes, downloadCodeImages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await db.select().from(downloadCodes).orderBy(desc(downloadCodes.createdAt));

  const codesWithImages = await Promise.all(
    codes.map(async (code) => {
      const codeImgs = await db
        .select({ imageId: downloadCodeImages.imageId })
        .from(downloadCodeImages)
        .where(eq(downloadCodeImages.codeId, code.id));
      return { ...code, imageIds: codeImgs.map((ci) => ci.imageId) };
    })
  );

  return NextResponse.json(codesWithImages);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, expiresAt, imageIds } = await request.json();
  if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });

  const code = generateCode();
  const id = crypto.randomUUID();

  await db.insert(downloadCodes).values({
    id,
    code,
    label,
    expiresAt: expiresAt || null,
  });

  if (imageIds && imageIds.length > 0) {
    for (const imageId of imageIds) {
      await db.insert(downloadCodeImages).values({ codeId: id, imageId });
    }
  }

  return NextResponse.json({ id, code });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await request.json();
  await db.update(downloadCodes).set({ active }).where(eq(downloadCodes.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await db.delete(downloadCodes).where(eq(downloadCodes.id, id));
  return NextResponse.json({ success: true });
}
