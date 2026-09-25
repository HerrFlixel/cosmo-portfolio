import { expect, test } from "@playwright/test";
import { newContext } from "./helpers/galleries";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });

// Eigene Kategorie für diese Datei (admin-api nutzt volleyball, admin-portfolio studio):
// 6 sichtbare Bilder (1 Kapitel, 3 Vorschau), 1 ausgeblendetes.
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await seedCategory(page, "hochzeiten", [
    { role: "chapter" },
    { role: "chapter_preview" },
    { role: "chapter_preview", portrait: true },
    { role: "chapter_preview" },
    {},
    { portrait: true },
    { visible: false },
  ]);
  await admin.close();
});

test("Startseite: Index mit Anzahl, Kapitel mit Bild, Vorschau und Link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallen, Rauch, Gänsehaut.");

  const index = page.getByRole("navigation", { name: "Kategorien" });
  const entry = index.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Hochzeiten", exact: true }) });
  await expect(entry).toContainText("(6)");

  const chapter = page.locator('[data-chapter="hochzeiten"]');
  await expect(chapter.getByRole("heading", { level: 2 })).toHaveText("Hochzeiten");
  await expect(chapter).toContainText("(6 Fotos)");
  expect(await chapter.locator(".bg-hall").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");
  await expect(chapter.getByRole("listitem")).toHaveCount(3);
  await expect(chapter.getByRole("img", { name: /^Hochzeiten, Foto/ })).toHaveCount(4);

  await chapter.getByRole("link", { name: "Alle Hochzeiten-Bilder" }).click();
  await expect(page).toHaveURL(/\/hochzeiten$/);
});

test("Kategorieseite: Titel mit Anzahl, alle sichtbaren Bilder, Alt-Texte in Admin-Reihenfolge", async ({ page }) => {
  await page.goto("/hochzeiten");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hochzeiten");
  await expect(page.getByRole("main").getByText("(6)", { exact: true })).toBeVisible();
  const photos = page.getByRole("button", { name: /^Hochzeiten, Foto \d$/ });
  await expect(photos).toHaveCount(6);
  await expect(photos.first()).toHaveAccessibleName("Hochzeiten, Foto 1");
});

test("Lightbox „Licht aus“: Tastatur, Knöpfe, Wischen, Fokus zurück", async ({ page }) => {
  await page.goto("/hochzeiten");
  const first = page.getByRole("button", { name: "Hochzeiten, Foto 1" });
  await first.click();
  const box = page.getByTestId("lightbox");
  await expect(box.getByText("1 / 6")).toBeVisible();
  expect(await box.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");

  await page.keyboard.press("ArrowRight");
  await expect(box.getByText("2 / 6")).toBeVisible();
  await box.getByRole("button", { name: "Vorheriges Foto" }).click();
  await expect(box.getByText("1 / 6")).toBeVisible();

  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width * 0.65, height / 2);
  await page.mouse.down();
  await page.mouse.move(width * 0.3, height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(box.getByText("2 / 6")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect(first).toBeFocused();
});

test("Kategorie-Pille klappt die fünf Kategorien auf und wechselt", async ({ page }) => {
  await page.goto("/hochzeiten");
  const pill = page.getByRole("button", { name: "Hochzeiten, Kategorie wechseln" });
  await expect(pill).toHaveAttribute("aria-expanded", "false");
  await pill.click();
  await expect(pill).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#category-menu");
  await expect(menu.getByRole("link")).toHaveCount(5);
  await expect(menu.getByRole("link", { name: /^Hochzeiten/ })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await pill.click();
  await menu.getByRole("link", { name: /^Studio/ }).click();
  await expect(page).toHaveURL(/\/studio$/);
});

// Befunde aus der Sichtprüfung: nichts darf seitlich überlaufen, Overlays liegen über Kopf und Pille.
test("Startseite und Kategorie laufen auf Handy, Tablet und Desktop nicht seitlich über", async ({ page }) => {
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/hochzeiten", "/en"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} @ ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test("Lightbox und Handy-Menü liegen über Kopf und Kategorie-Pille", async ({ page }) => {
  await page.goto("/hochzeiten");
  await page.getByRole("button", { name: "Hochzeiten, Foto 1" }).click();
  const topmost = (x: number, y: number, selector: string) =>
    page.evaluate(([px, py, sel]) => document.elementFromPoint(px as number, py as number)?.closest(sel as string) !== null, [x, y, selector] as const);
  const { width, height } = page.viewportSize()!;
  expect(await topmost(80, 30, '[data-testid="lightbox"]')).toBe(true);
  expect(await topmost(width / 2, height - 40, '[data-testid="lightbox"]')).toBe(true);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menü" }).click();
  expect(await topmost(195, 844 - 40, "#mobile-menu")).toBe(true);
});

test("Dialoge halten den Fokus: Umschalt+Tab landet nie hinter Lightbox oder Menü", async ({ page }) => {
  const outside = (selector: string) =>
    page.evaluate((sel) => document.activeElement !== document.body && document.activeElement?.closest(sel) === null, selector);
  await page.goto("/hochzeiten");
  await page.getByRole("button", { name: "Hochzeiten, Foto 1" }).click();
  await page.keyboard.press("Shift+Tab");
  expect(await outside('[data-testid="lightbox"]')).toBe(false);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menü" }).click();
  await page.keyboard.press("Shift+Tab");
  expect(await outside("#mobile-menu")).toBe(false);
});

test("Das erste Hero-Bild ist ohne JavaScript sofort sichtbar (LCP)", async ({ page }) => {
  const html = await (await page.request.get("/")).text();
  const tag = html.match(/<img\b[^>]*fetchpriority="high"[^>]*>/i)?.[0];
  expect(tag).toBeDefined();
  expect(tag).toContain("data-loaded");
});

test("Leere Kategorie: Hinweis steht unter dem Titel statt darüber", async ({ page }) => {
  await page.goto("/fussball");
  const empty = page.getByText("Hier kommen bald Bilder.");
  test.skip((await empty.count()) === 0, "Fußball ist in dieser Umgebung nicht leer");
  const title = await page.getByRole("heading", { level: 1 }).boundingBox();
  const note = await empty.boundingBox();
  expect(note!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
});
