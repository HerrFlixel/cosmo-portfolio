import { expect, test } from "@playwright/test";

test("unbekannte Galerie: Seite, Bilder und ZIP antworten mit 404", async ({ page, request }) => {
  expect((await page.goto("/g/gibt-es-nicht"))?.status()).toBe(404);
  expect((await request.get("/g/gibt-es-nicht/zip?set=all")).status()).toBe(404);
  expect((await request.get(`/g/gibt-es-nicht/img/${crypto.randomUUID()}/original`)).status()).toBe(404);
});
