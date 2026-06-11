import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, images } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { slugify } from "@/lib/slug";
import { extractDriveFolderId } from "@/lib/drive";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
  const allImages = await db.select({ id: images.id, projectId: images.projectId }).from(images);
  const withCounts = all.map((p) => ({
    ...p,
    imageCount: allImages.filter((img) => img.projectId === p.id).length,
  }));
  return NextResponse.json(withCounts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { titleDe, titleEn, category, year, location, driveFolderId } = body;
  if (!titleDe || !category || !year || !driveFolderId) {
    return NextResponse.json({ error: "Pflichtfelder: Titel (DE), Kategorie, Jahr, Drive-Ordner-ID" }, { status: 400 });
  }
  if (!["sport", "hochzeit", "event"].includes(category)) {
    return NextResponse.json({ error: "Ungültige Kategorie" }, { status: 400 });
  }

  // Slug eindeutig machen
  const base = slugify(titleDe) || "projekt";
  const existing = await db.select({ slug: projects.slug }).from(projects);
  const taken = new Set(existing.map((p) => p.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;

  const maxOrder = (await db.select({ sortOrder: projects.sortOrder }).from(projects)).reduce(
    (max, p) => Math.max(max, p.sortOrder),
    0
  );

  const inserted = await db
    .insert(projects)
    .values({
      slug,
      titleDe,
      titleEn: titleEn || null,
      category,
      year: Number(year),
      location: location || null,
      driveFolderId: extractDriveFolderId(driveFolderId),
      sortOrder: maxOrder + 1,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ALLOWED_FIELDS = [
    "titleDe",
    "titleEn",
    "category",
    "year",
    "location",
    "driveFolderId",
    "coverImageId",
    "sortOrder",
    "visible",
  ] as const;
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => (ALLOWED_FIELDS as readonly string[]).includes(key))
  );
  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "Keine gültigen Felder" }, { status: 400 });
  }
  if (typeof filtered.driveFolderId === "string") {
    filtered.driveFolderId = extractDriveFolderId(filtered.driveFolderId);
  }

  await db.update(projects).set(filtered).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(images).where(eq(images.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
