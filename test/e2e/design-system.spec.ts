import { expect, test } from "@playwright/test";

test("Tokens: Papier-Hintergrund, Tinte als Textfarbe", async ({ page }) => {
  await page.goto("/");
  const colors = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, fg: s.color };
  });
  expect(colors).toEqual({ bg: "rgb(241, 239, 234)", fg: "rgb(20, 20, 20)" });
});

test("Schriften: Bodoni-Headline, Archivo-Kategorien (schmal, kursiv, 900), Martian-Labels", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const h1 = page.getByRole("heading", { level: 1 });
  expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Bodoni Moda");

  const category = page.getByRole("link", { name: "Floorball" });
  const sport = await category.evaluate((el) => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily, style: s.fontStyle, weight: s.fontWeight, transform: s.textTransform };
  });
  expect(sport.family).toContain("Archivo");
  expect(sport).toMatchObject({ style: "italic", weight: "900", transform: "uppercase" });

  const label = page.getByText("01", { exact: true });
  expect(await label.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Martian Mono");
});

test("Schriften sind geladen und kommen nicht von Google (DSGVO)", async ({ page }) => {
  const googleRequests: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    if (host.endsWith("fonts.googleapis.com") || host.endsWith("fonts.gstatic.com")) googleRequests.push(r.url());
  });

  await page.goto("/");
  // document.fonts.check() ist auch ohne eingebundene Schrift true – daher echte, geladene @font-face prüfen.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts];
    return ["Bodoni Moda", "Archivo", "Martian Mono"].map((family) =>
      faces.some((f) => f.family.replace(/["']/g, "") === family && f.status === "loaded"),
    );
  });

  expect(loaded).toEqual([true, true, true]);
  expect(googleRequests).toEqual([]);
});
