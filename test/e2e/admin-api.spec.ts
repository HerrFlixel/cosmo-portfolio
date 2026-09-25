import { expect, test } from "@playwright/test";
import { ADMIN_STATE, TINY_WEBP, clearCategory } from "./helpers/admin";

const ID = "00000000-0000-4000-8000-000000000000";

test.describe.configure({ mode: "serial" });

test("alle Admin-APIs verlangen eine Anmeldung", async ({ request }) => {
  const calls = [
    request.put(`/admin/api/media/portfolio/${ID}/800`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } }),
    request.get("/admin/api/portfolio?category=volleyball"),
    request.post("/admin/api/portfolio", { data: { id: ID, category: "volleyball", width: 1, height: 1, color: "#000000" } }),
    request.patch(`/admin/api/portfolio/${ID}`, { data: { visible: false } }),
    request.delete(`/admin/api/portfolio/${ID}`),
    request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [] } }),
  ];
  for (const res of await Promise.all(calls)) {
    expect(res.status(), res.url()).toBe(401);
    expect(await res.json()).toEqual({ error: "Nicht angemeldet." });
  }
});

test.describe("angemeldet", () => {
  test.use({ storageState: ADMIN_STATE });

  test.beforeEach(async ({ page }) => {
    await clearCategory(page, "volleyball");
  });

  test("Anfragen von fremder Herkunft werden abgewiesen", async ({ page }) => {
    const res = await page.request.put(`/admin/api/media/portfolio/${ID}/800`, {
      data: TINY_WEBP,
      headers: { "content-type": "image/webp", origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });

  test("Upload lehnt falsche Orte, Nicht-Bilder und zu große Dateien ab", async ({ page }) => {
    const put = (path: string, data: Buffer, type = "image/webp") =>
      page.request.put(path, { data, headers: { "content-type": type } });
    expect((await put(`/admin/api/media/galleries/${ID}/800`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/not-a-uuid/800`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/${ID}/900`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, Buffer.from("<html>no</html>"))).status()).toBe(415);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, TINY_WEBP, "image/jpeg")).status()).toBe(415);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, Buffer.alloc(10 * 1024 * 1024 + 1, 0))).status()).toBe(413);
    expect((await page.request.get(`/media/portfolio/${ID}/800`)).status()).toBe(404);
  });

  test("halber Upload wird nicht angelegt, vollständiger schon; Medien sind öffentlich und lange cachebar", async ({ page, browser }) => {
    const id = crypto.randomUUID();
    const put = (size: number) =>
      page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
    const create = () =>
      page.request.post("/admin/api/portfolio", { data: { id, category: "volleyball", width: 3000, height: 2000, color: "#aabbcc" } });

    expect((await put(800)).status()).toBe(204);
    expect((await put(1600)).status()).toBe(204);
    const incomplete = await create();
    expect(incomplete.status()).toBe(400);
    expect(await incomplete.json()).toEqual({ error: "Upload unvollständig: nicht alle Bildgrößen sind vorhanden." });

    expect((await put(2400)).status()).toBe(204);
    const created = await create();
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({ id, category: "volleyball", sort: 0, visible: true });

    // Öffentlich, auch für einen englischen Browser ohne Anmeldung, nicht umgeleitet
    const anon = await browser.newContext({ locale: "en-US" });
    const media = await anon.request.get(`/media/portfolio/${id}/800`, { maxRedirects: 0 });
    expect(media.status()).toBe(200);
    expect(media.headers()["content-type"]).toBe("image/webp");
    expect(media.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    await anon.close();

    expect((await page.request.delete(`/admin/api/portfolio/${id}`)).status()).toBe(204);
    expect((await page.request.get(`/media/portfolio/${id}/800`)).status()).toBe(404);
  });

  test("ändern, sortieren und Fehlermeldungen der Portfolio-API", async ({ page }) => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const id = crypto.randomUUID();
      for (const size of [800, 1600, 2400]) {
        await page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
      }
      await page.request.post("/admin/api/portfolio", { data: { id, category: "volleyball", width: 10, height: 10, color: "#000000" } });
      ids.push(id);
    }

    const patched = await page.request.patch(`/admin/api/portfolio/${ids[0]}`, { data: { visible: false, altDe: "Block", role: "chapter" } });
    expect(await patched.json()).toMatchObject({ visible: false, altDe: "Block", role: "chapter" });

    expect((await page.request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [ids[1], ids[0]] } })).status()).toBe(204);
    const list = (await (await page.request.get("/admin/api/portfolio?category=volleyball")).json()) as { id: string }[];
    expect(list.map((i) => i.id)).toEqual([ids[1], ids[0]]);

    const badOrder = await page.request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [ids[0]] } });
    expect(badOrder.status()).toBe(400);
    expect((await page.request.patch(`/admin/api/portfolio/${ids[0]}`, { data: { unbekannt: 1 } })).status()).toBe(400);
    expect((await page.request.patch(`/admin/api/portfolio/${ID}`, { data: { visible: true } })).status()).toBe(404);
    expect((await page.request.get("/admin/api/portfolio?category=quatsch")).status()).toBe(400);
  });
});

test("öffentliche Medien-Route liefert nie private Bereiche", async ({ request }) => {
  expect((await request.get(`/media/galleries/${ID}/800`)).status()).toBe(404);
  expect((await request.get(`/media/portfolio/${ID}/800/extra`)).status()).toBe(404);
});
