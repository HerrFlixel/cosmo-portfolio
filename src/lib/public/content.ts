import { CATEGORIES, type Category } from "@/lib/categories";
import type { Db } from "@/lib/db/client";
import { listVisible, type PortfolioImage } from "@/lib/portfolio/repo";

export type Chapter = { category: Category; count: number; image: PortfolioImage | null; previews: PortfolioImage[] };
export type HomeContent = { heroes: PortfolioImage[]; chapters: Chapter[]; counts: Record<Category, number> };
export type CategoryNavItem = { category: Category; count: number; cover: PortfolioImage | null };
export type CategoryContent = { images: PortfolioImage[]; nav: CategoryNavItem[] };

export const MAX_HEROES = 3;
export const MAX_PREVIEWS = 5;

/** Pro Kategorie: gewähltes Kapitelbild (sonst das erste), gewählte Vorschaubilder (sonst die nächsten). */
function chaptersFrom(visible: PortfolioImage[]): Chapter[] {
  return CATEGORIES.map((category) => {
    const images = visible.filter((image) => image.category === category);
    const image = images.find((candidate) => candidate.role === "chapter") ?? images[0] ?? null;
    const chosen = images.filter((candidate) => candidate.role === "chapter_preview");
    const previews = (chosen.length > 0 ? chosen : images.filter((candidate) => candidate.id !== image?.id)).slice(0, MAX_PREVIEWS);
    return { category, count: images.length, image, previews };
  });
}

/** Startseite (Spec §6.1): Hero-Collage, fünf Kapitel, Zähler. Gezählt werden nur sichtbare Bilder. */
export async function getHomeContent(db: Db): Promise<HomeContent> {
  const visible = await listVisible(db);
  const chapters = chaptersFrom(visible);
  const chosenHeroes = visible.filter((image) => image.role === "hero").slice(0, MAX_HEROES);
  // Noch keine Hero-Bilder gewählt: die Kapitelbilder springen ein, damit die Startseite nie leer wirkt.
  const heroes = chosenHeroes.length > 0 ? chosenHeroes : chapters.flatMap((chapter) => (chapter.image ? [chapter.image] : [])).slice(0, MAX_HEROES);
  const counts = Object.fromEntries(chapters.map((chapter) => [chapter.category, chapter.count])) as Record<Category, number>;
  return { heroes, chapters, counts };
}

/** Kategorieseite (Spec §6.2): sichtbare Bilder der Kategorie plus Daten für die Kategorie-Pille. */
export async function getCategoryContent(db: Db, category: Category): Promise<CategoryContent> {
  const visible = await listVisible(db);
  return {
    images: visible.filter((image) => image.category === category),
    nav: chaptersFrom(visible).map((chapter) => ({ category: chapter.category, count: chapter.count, cover: chapter.image })),
  };
}
