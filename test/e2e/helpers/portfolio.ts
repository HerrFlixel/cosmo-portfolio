import { expect, type Page } from "@playwright/test";
import { TINY_WEBP, clearCategory } from "./admin";

type Seed = { role?: "chapter" | "chapter_preview"; visible?: boolean; portrait?: boolean };

/** Leert die Kategorie und legt Bilder über die Admin-API an (Reihenfolge = Anlage-Reihenfolge). */
export async function seedCategory(page: Page, category: string, seeds: Seed[]): Promise<string[]> {
  await clearCategory(page, category);
  const ids: string[] = [];
  for (const seed of seeds) {
    const id = crypto.randomUUID();
    for (const size of [800, 1600, 2400]) {
      const put = await page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
      expect(put.status()).toBe(204);
    }
    const [width, height] = seed.portrait ? [2000, 3000] : [3000, 2000];
    const created = await page.request.post("/admin/api/portfolio", { data: { id, category, width, height, color: "#5a6b7c" } });
    expect(created.status()).toBe(201);
    const patch: Record<string, unknown> = {};
    if (seed.role) patch.role = seed.role;
    if (seed.visible === false) patch.visible = false;
    if (Object.keys(patch).length > 0) {
      expect((await page.request.patch(`/admin/api/portfolio/${id}`, { data: patch })).status()).toBe(200);
    }
    ids.push(id);
  }
  return ids;
}
