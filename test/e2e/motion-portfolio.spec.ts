import { expect, test, type Page } from "@playwright/test";
import { newContext } from "./helpers/galleries";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });
test.use({ reducedMotion: "no-preference" });

// Eigene Kategorie für Bewegungs-Tests (Floorball ist Kapitel 1, unabhängig von anderen Testdaten).
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await seedCategory(page, "floorball", [{ role: "chapter" }, { role: "chapter_preview" }, { role: "chapter_preview", portrait: true }, {}, { portrait: true }, {}]);
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

/** Hellster und dunkelster Bildpunkt (Luminanz 0–255) im Kasten, dekodiert in einer leeren Seite (ohne CSP). */
async function luminance(page: Page, box: { x: number; y: number; width: number; height: number }) {
  // Nur der sichtbare Teil; liegt nichts im Bild (Szene noch unterwegs), gilt „kein Kontrast“ und expect.poll versucht es erneut.
  const viewport = page.viewportSize()!;
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const clip = { x, y, width: Math.min(viewport.width, box.x + box.width) - x, height: Math.min(viewport.height, box.y + box.height) - y };
  if (clip.width < 4 || clip.height < 4) return { min: 255, max: 0 };
  const png = await page.screenshot({ clip });
  const decoder = await page.context().newPage();
  const range = await decoder.evaluate(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max };
  }, png.toString("base64"));
  await decoder.close();
  return range;
}

test("Bewegung: der Kapiteltitel bleibt lesbar – hell im Dunkeln, dunkel bei Tageslicht, auch beim Zurückscrollen", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator('[data-chapter="floorball"] [data-chapter-stage]');
  const heading = stage.locator("h2");
  const top = await stage.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const height = await page.evaluate(() => window.innerHeight);
  const box = async () => (await heading.boundingBox())!;
  // Mitte der Szene: dunkel, Titel hell.
  const middle = async () => {
    await page.evaluate((y) => window.scrollTo(0, y), top + height * 1.8 * 0.55);
    await expect.poll(async () => (await luminance(page, await box())).max, { timeout: 5000 }).toBeGreaterThan(150);
  };
  await middle();
  // Nach der Szene: Tageslicht, der Teil des Titels über dem Papier (rechte Hälfte) ist dunkel.
  await page.evaluate((y) => window.scrollTo(0, y), top + height * 2.2);
  const paperPart = async () => {
    const { x, y, width, height: h } = await box();
    return luminance(page, { x: x + width * 0.55, y: y + h * 0.25, width: width * 0.4, height: h * 0.5 });
  };
  await expect.poll(async () => (await paperPart()).min, { timeout: 5000 }).toBeLessThan(80);
  // Zurück in die Szene: wieder hell.
  await middle();
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

test("Bewegung: Cursor wird über Bildern zum Orbit-Ring", async ({ page }) => {
  await page.goto("/floorball");
  await page.mouse.move(10, 10);
  await page.getByRole("button", { name: "Floorball, Foto 1" }).hover();
  const cursor = page.locator("[data-cursor]");
  await expect(cursor).toHaveAttribute("data-state", "image");
  // Geneigtes Oval wie der Orbit im Logo (die Form sitzt im ::before, GSAP setzt am Element selbst `rotate: none`).
  await expect.poll(() => cursor.evaluate((element) => getComputedStyle(element, "::before").rotate)).toBe("-12deg");
  expect(await cursor.evaluate((element) => getComputedStyle(element, "::before").borderRadius)).toBe("50%");
});
