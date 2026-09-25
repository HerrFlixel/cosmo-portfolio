import { expect, test } from "@playwright/test";

const skipIntro = () => sessionStorage.setItem("cosmo-intro", "seen");

test.describe("mit Bewegung", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Lenis und has-motion sind aktiv, auch nach einem Seitenwechsel", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const html = page.locator("html");
    await expect(html).toHaveClass(/has-motion/);
    await expect(html).toHaveClass(/lenis/);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect(html).toHaveClass(/lenis/);
    expect(await page.evaluate(() => document.querySelectorAll("html.lenis").length)).toBe(1);
  });
});

test("Bewegung: mit „weniger Bewegung“ weder has-motion noch Lenis", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("html")).not.toHaveClass(/has-motion|lenis/);
});

test.describe("Intro", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Intro „Orbit“ läuft beim ersten Besuch und nur einmal pro Sitzung", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "running");
    await expect(page.locator("[data-site-logo] [data-logo-photos]")).toBeAttached();
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 6000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => page.locator("[data-site-logo]").evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await page.reload();
    await expect(html).not.toHaveAttribute("data-intro", /pending|running/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Bewegung: eine Taste überspringt das Intro (auch auf Englisch)", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro", "running");
    await page.keyboard.press("Space");
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 1000 });
  });
});

test("Bewegung: mit „weniger Bewegung“ kein Intro, Logo und Headline sofort sichtbar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-site-logo]")).toBeVisible();
});

test.describe("Überschriften und Fußzeile", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Überschriften erscheinen Zeile für Zeile hinter einer Maske", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const lines = page.locator("[data-reveal] .reveal-line");
    await expect(lines.first()).toBeAttached();
    await expect
      .poll(() => lines.first().evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Bewegung: der Ring im Fußzeilen-Logo pendelt beim Scrollen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const ring = page.locator("footer [data-logo-ring-spin]");
    const angle = () => ring.evaluate((element) => element.getAttribute("transform") ?? getComputedStyle(element).transform);
    const before = await angle();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(angle).not.toBe(before);
  });
});

test("Bewegung: mit „weniger Bewegung“ werden Überschriften nicht zerlegt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator(".reveal-line")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
