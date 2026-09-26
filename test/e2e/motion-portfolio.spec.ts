import { expect, test } from "@playwright/test";
import { expectNoViolations } from "./helpers/a11y";
import { newContext } from "./helpers/galleries";
import { luminance } from "./helpers/pixels";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });
test.use({ reducedMotion: "no-preference" });

// Eigene Kategorie für Bewegungs-Tests (Floorball ist Kapitel 1, unabhängig von anderen Testdaten).
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  // Hochkant-Kapitelbild: machte die fixierte Szene höher als den Bildschirm, der Titel lag darunter (Felix, 2026-09-26).
  await seedCategory(page, "floorball", [{ role: "chapter", portrait: true }, { role: "chapter_preview" }, { role: "chapter_preview", portrait: true }, {}, { portrait: true }, {}]);
  await admin.close();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("cosmo-intro", "seen"));
});

const opacity = (locator: import("@playwright/test").Locator) => async () => Number(await locator.evaluate((element) => getComputedStyle(element).opacity));

test("Bewegung: Kapitel „Licht aus“ dunkelt beim Scrollen ab und wird wieder hell", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator('[data-chapter="floorball"] [data-chapter-stage]');
  const bg = stage.locator("[data-chapter-bg]");
  await expect.poll(opacity(bg)).toBeLessThan(0.1);
  const top = await stage.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const height = await page.evaluate(() => window.innerHeight);
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 0.8);
  await expect.poll(opacity(bg), { timeout: 5000 }).toBeGreaterThan(0.9);
  await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 2.2);
  await expect.poll(opacity(bg), { timeout: 5000 }).toBeLessThan(0.1);
});

test("Bewegung: der Kapiteltitel bleibt lesbar – hell im Dunkeln, dunkel bei Tageslicht, auch beim Zurückscrollen", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator('[data-chapter="floorball"] [data-chapter-stage]');
  const heading = stage.locator("h2");
  const top = await stage.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const height = await page.evaluate(() => window.innerHeight);
  const box = async () => (await heading.boundingBox())!;
  // Mitte der Szene: dunkel, Titel hell.
  // Der Titel liegt als feste Schrift auf dem Bild: keine Mischung, volle Deckkraft (Felix, 2026-09-26).
  const solid = async () => {
    expect(await heading.evaluate((element) => getComputedStyle(element).mixBlendMode)).toBe("normal");
    await expect.poll(() => heading.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  };
  const middle = async () => {
    await page.evaluate((y) => window.scrollTo(0, y), top + height * 1.8 * 0.55);
    await expect.poll(async () => (await luminance(page, await box())).max, { timeout: 5000 }).toBeGreaterThan(150);
    await solid();
  };
  await middle();
  // Nach der Szene: Tageslicht, der Teil des Titels über dem Papier (rechte Hälfte) ist dunkel.
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 2.2);
  const paperPart = async () => {
    const { x, y, width, height: h } = await box();
    return luminance(page, { x: x + width * 0.55, y: y + h * 0.25, width: width * 0.4, height: h * 0.5 });
  };
  await expect.poll(async () => (await paperPart()).min, { timeout: 5000 }).toBeLessThan(80);
  await solid();
  // Zurück in die Szene: wieder hell.
  await middle();
});

test("Bewegung: die Szene passt auf einen Bildschirm – bei Hochkant-Kapitelbild stehen Titel und Zähler im Vollbild (Desktop, kleines Handy)", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const stage = page.locator('[data-chapter="floorball"] [data-chapter-stage]');
    const title = stage.locator("[data-chapter-title]");
    expect(await stage.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(viewport.height + 1);
    const top = await stage.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    const length = (viewport.width < 768 ? 1.1 : 1.8) * viewport.height;
    await page.evaluate((y) => window.scrollTo(0, y), top + length * 0.58);
    await expect.poll(() => title.locator("h2").evaluate((element) => getComputedStyle(element).opacity), { timeout: 5000 }).toBe("1");
    const box = (await title.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
});

test("Bewegung: mit „weniger Bewegung“ bleibt das Kapitel ein statisches dunkles Band", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: "de-DE", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const bg = page.locator('[data-chapter="floorball"] [data-chapter-bg]');
  expect(await opacity(bg)()).toBe(1);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await context.close();
});

test("Bewegung: Spalten der Kategorieseite laufen unterschiedlich schnell", async ({ page }) => {
  await page.goto("/floorball");
  const columns = page.locator("main [data-speed]");
  await expect(columns).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect
    .poll(() => columns.evaluateAll((elements) => elements.map((element) => new DOMMatrix(getComputedStyle(element).transform).m42)))
    .not.toEqual([0, 0]);
});

test("Bewegung: Lightbox fliegt aus dem Passepartout auf und schließt normal", async ({ page }) => {
  await page.goto("/floorball");
  await page.getByRole("button", { name: "Floorball, Foto 1" }).click();
  const image = page.getByTestId("lightbox").locator("img");
  const scaleNow = () => image.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  expect(await scaleNow()).not.toBeCloseTo(1, 2);
  await expect.poll(scaleNow).toBeCloseTo(1, 2);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("lightbox")).toBeHidden();
});

test("Bewegung: Cursor-Blende blendet über Bildern ab und bleibt gleich groß", async ({ page }) => {
  await page.goto("/floorball");
  await page.mouse.move(10, 10);
  const cursor = page.locator("[data-cursor]");
  const edge = () => cursor.locator("line").first().evaluate((line) => Math.hypot(Number(line.getAttribute("x2")), Number(line.getAttribute("y2"))));
  const open = await edge();
  await page.getByRole("button", { name: "Floorball, Foto 1" }).hover();
  await expect(cursor).toHaveAttribute("data-state", "image");
  await expect.poll(edge).toBeLessThan(open - 2);
  expect(await cursor.evaluate((element) => [element.offsetWidth, element.offsetHeight])).toEqual([22, 22]);
});

test("Bewegung: das Kapitelbild fliegt beim Wechsel auf die Kategorieseite (ohne Fehler)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => {
    const counter = window as unknown as { transitions: number };
    counter.transitions = 0;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      counter.transitions++;
      return start(...args);
    }) as typeof document.startViewTransition;
  });
  await page.locator('[data-chapter="floorball"]').getByRole("link", { name: "Alle Floorball-Bilder" }).click();
  await expect(page).toHaveURL(/\/floorball$/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("Bewegung: Zurück landet wieder an der vorherigen Stelle der Startseite", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('[data-chapter="floorball"]').getByRole("link", { name: "Alle Floorball-Bilder" });
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(500);
  await link.click();
  await expect(page).toHaveURL(/\/floorball$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(before - 80);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before + 80);
});

test("Bewegung: Barrierefreiheit (axe) auf Startseite und Kategorie", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-chapter="floorball"]')).toBeVisible();
  await expectNoViolations(page, "/ mit Bewegung");
  await page.goto("/floorball");
  await expectNoViolations(page, "/floorball mit Bewegung");
});
