import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { albums } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function extractFolderId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(albums).orderBy(desc(albums.createdAt));
  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, driveFolder, expiresAt } = await request.json();
  if (!name || !driveFolder) {
    return NextResponse.json({ error: "Name und Drive-Ordner erforderlich" }, { status: 400 });
  }

  const driveFolderId = extractFolderId(driveFolder);
  const code = generateCode();
  const id = crypto.randomUUID();

  await db.insert(albums).values({
    id,
    name,
    code,
    driveFolderId,
    expiresAt: expiresAt || null,
  });

  return NextResponse.json({ id, code });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await request.json();
  await db.update(albums).set({ active }).where(eq(albums.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await db.delete(albums).where(eq(albums.id, id));
  return NextResponse.json({ success: true });
}
