import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import { createDb } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { getCategoryContent, getHomeContent } from "@/lib/public/content";

const db = () => createDb(env.DB);
let sort = 0;

async function add(category: Category, fields: Partial<typeof portfolioImages.$inferInsert> = {}) {
  sort++;
  const [row] = await db()
    .insert(portfolioImages)
    .values({ id: crypto.randomUUID(), category, width: 3000, height: 2000, color: "#111111", sort, ...fields })
    .returning();
  return row;
}

beforeEach(async () => {
  await db().delete(portfolioImages);
});

describe("getHomeContent", () => {
  it("counts only visible images and keeps the fixed category order", async () => {
    await add("studio");
    await add("floorball");
    await add("floorball", { visible: false });
    const home = await getHomeContent(db());
    expect(home.counts).toEqual({ floorball: 1, volleyball: 0, fussball: 0, hochzeiten: 0, studio: 1 });
    expect(home.chapters.map((chapter) => chapter.category)).toEqual(["floorball", "volleyball", "fussball", "hochzeiten", "studio"]);
  });

  it("uses the chosen chapter image and previews, otherwise the first images", async () => {
    await add("floorball");
    const chapter = await add("floorball", { role: "chapter" });
    const preview = await add("floorball", { role: "chapter_preview" });
    const volleyball = [await add("volleyball"), await add("volleyball"), await add("volleyball")];
    const home = await getHomeContent(db());
    expect(home.chapters[0].image?.id).toBe(chapter.id);
    expect(home.chapters[0].previews.map((image) => image.id)).toEqual([preview.id]);
    expect(home.chapters[1].image?.id).toBe(volleyball[0].id);
    expect(home.chapters[1].previews.map((image) => image.id)).toEqual([volleyball[1].id, volleyball[2].id]);
    expect(home.chapters[2]).toEqual({ category: "fussball", count: 0, image: null, previews: [] });
  });

  it("limits fallback previews to five", async () => {
    for (let i = 0; i < 8; i++) await add("hochzeiten");
    expect((await getHomeContent(db())).chapters[3].previews).toHaveLength(5);
  });

  it("takes up to three hero images, otherwise the chapter images", async () => {
    const hero = await add("studio", { role: "hero" });
    expect((await getHomeContent(db())).heroes.map((image) => image.id)).toEqual([hero.id]);

    await db().delete(portfolioImages);
    const floorball = await add("floorball");
    const studio = await add("studio");
    expect((await getHomeContent(db())).heroes.map((image) => image.id)).toEqual([floorball.id, studio.id]);
  });
});

describe("getCategoryContent", () => {
  it("returns the visible images of one category in admin order and the navigation for all five", async () => {
    const second = await add("studio", { sort: 2 });
    const first = await add("studio", { sort: 1 });
    await add("studio", { visible: false });
    await add("floorball");
    const content = await getCategoryContent(db(), "studio");
    expect(content.images.map((image) => image.id)).toEqual([first.id, second.id]);
    expect(content.nav.map((item) => [item.category, item.count])).toEqual([
      ["floorball", 1],
      ["volleyball", 0],
      ["fussball", 0],
      ["hochzeiten", 0],
      ["studio", 2],
    ]);
    expect(content.nav[4].cover?.id).toBe(first.id);
  });
});
