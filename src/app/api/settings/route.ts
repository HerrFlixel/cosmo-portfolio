import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allSettings = await db.select().from(settings);
  const settingsMap: Record<string, string> = {};
  allSettings.forEach((s) => { settingsMap[s.key] = s.value; });
  return NextResponse.json(settingsMap);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  return NextResponse.json({ success: true });
}
