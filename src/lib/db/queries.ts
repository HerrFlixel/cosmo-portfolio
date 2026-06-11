import { db } from "./index";
import { images, albums, clientLogos, settings, projects } from "./schema";
import { eq, and, asc } from "drizzle-orm";

export async function getVisibleImages() {
  return db.select().from(images).where(eq(images.visible, true)).orderBy(asc(images.sortOrder));
}

export async function getAllImages() {
  return db.select().from(images).orderBy(asc(images.sortOrder));
}

export async function getSetting(key: string) {
  const result = await db.select().from(settings).where(eq(settings.key, key));
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getClientLogos() {
  return db.select().from(clientLogos).orderBy(asc(clientLogos.sortOrder));
}

export async function verifyAlbumCode(code: string) {
  const result = await db
    .select()
    .from(albums)
    .where(and(eq(albums.code, code), eq(albums.active, true)));

  const album = result[0];
  if (!album) return null;

  if (album.expiresAt && new Date(album.expiresAt) < new Date()) {
    return null;
  }

  return album;
}

export async function getVisibleProjects() {
  return db
    .select()
    .from(projects)
    .where(eq(projects.visible, true))
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt));
}

export interface ProjectWithCover {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  location: string | null;
  coverId: string;
}

/** Sichtbare Projekte mit Cover (coverImageId oder erstes Bild); Projekte ohne Bilder werden ausgelassen. */
export async function getProjectsWithCovers(): Promise<ProjectWithCover[]> {
  const list = await getVisibleProjects();
  const result: ProjectWithCover[] = [];
  for (const p of list) {
    let coverId = p.coverImageId;
    if (!coverId) {
      const first = await db
        .select({ id: images.id })
        .from(images)
        .where(eq(images.projectId, p.id))
        .orderBy(asc(images.sortOrder))
        .limit(1);
      coverId = first[0]?.id ?? null;
    }
    if (coverId) {
      result.push({
        id: p.id,
        slug: p.slug,
        titleDe: p.titleDe,
        titleEn: p.titleEn,
        category: p.category,
        year: p.year,
        location: p.location,
        coverId,
      });
    }
  }
  return result;
}

export async function getProjectBySlug(slug: string) {
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.visible, true)));
  return result[0] ?? null;
}

export async function getProjectImages(projectId: string) {
  return db
    .select()
    .from(images)
    .where(and(eq(images.projectId, projectId), eq(images.visible, true)))
    .orderBy(asc(images.sortOrder));
}
