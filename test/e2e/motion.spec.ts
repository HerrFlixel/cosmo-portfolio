import { expect, test } from "@playwright/test";
import { difference } from "./helpers/pixels";

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

test.describe("Handy-Menü", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 390, height: 844 } });

  test("Bewegung: Handy-Menü baut sich gestaffelt auf und sperrt das Scrollen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.getByRole("button", { name: "Menü" }).click();
    const items = page.locator("#mobile-menu [data-menu-item]");
    await expect(items.first()).toBeVisible();
    expect(Number(await items.last().evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(1);
    await expect.poll(async () => Number(await items.last().evaluate((element) => getComputedStyle(element).opacity))).toBe(1);
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
  });

  test("Bewegung: Seitenwechsel aus dem Menü – das Menü bleibt stehen, bis der Vorhang es deckt", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.getByRole("button", { name: "Menü" }).click();
    const link = page.locator("#mobile-menu").getByRole("link", { name: "Kontakt" });
    await link.hover();
    await page.waitForTimeout(1200);
    const band = { x: 0, y: 80, width: 390, height: 300 };
    const before = await page.screenshot({ clip: band });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
    await link.click();
    await page.waitForFunction(() => document.documentElement.matches(":active-view-transition"));
    await page.waitForTimeout(1500);
    expect(await difference(page, before, await page.screenshot({ clip: band }))).toBeLessThan(0.02);
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect(page.locator("#mobile-menu")).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Mikro-Interaktionen", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Cursor-Punkt folgt der Maus, wird über Links größer und ersetzt den System-Cursor", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const cursor = page.locator("[data-cursor]");
    // Erst nach der Hydration hört der Cursor zu; bis zur ersten Bewegung bleibt der System-Cursor sichtbar.
    await expect(cursor).toBeAttached();
    await expect(page.locator("html")).not.toHaveClass(/has-cursor/);
    await page.mouse.move(380, 280);
    await page.mouse.move(400, 300);
    await expect(cursor).toHaveAttribute("data-visible", "");
    await expect
      .poll(() =>
        cursor.evaluate((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          return [Math.round(matrix.e), Math.round(matrix.f)];
        }),
      )
      .toEqual([400, 300]);
    await expect(page.locator("html")).toHaveClass(/has-cursor/);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).hover();
    await expect(cursor).toHaveAttribute("data-state", "link");
  });

  test("Bewegung: Scroll-Fortschritt schließt sich bis zum Seitenende", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const ring = page.locator("[data-scroll-progress] circle").last();
    const offset = async () => Number.parseFloat(await ring.evaluate((element) => getComputedStyle(element).strokeDashoffset));
    expect(await offset()).toBeGreaterThan(90);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(offset).toBeLessThan(2);
  });

  test("Bewegung: Menüpunkte rollen beim Hover in die Bodoni-Kursive", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const link = page.getByRole("banner").getByRole("link", { name: "Kontakt" });
    const italic = link.locator(".roll-b");
    await link.hover();
    await expect.poll(() => italic.evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(await italic.evaluate((element) => getComputedStyle(element).fontStyle)).toBe("italic");
  });
});

test("Bewegung: mit „weniger Bewegung“ kein eigener Cursor, kein Fortschrittsring, keine Rolle", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("[data-cursor]")).toHaveCount(0);
  await expect(page.locator("[data-scroll-progress]")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Kontakt" }).locator(".roll-b")).toBeHidden();
});

const countTransitions = () => {
  const counter = window as unknown as { transitions: number };
  counter.transitions = 0;
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((...args: Parameters<typeof start>) => {
    counter.transitions++;
    return start(...args);
  }) as typeof document.startViewTransition;
};
const transitions = () => (window as unknown as { transitions: number }).transitions;

test.describe("Seitenwechsel", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Seitenwechsel läuft als View Transition (Papier-Vorhang)", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.evaluate(countTransitions);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect.poll(() => page.evaluate(transitions)).toBeGreaterThan(0);
  });

  test("Bewegung: beim Seitenwechsel bleibt die alte Seite stehen, bis der Vorhang sie von unten deckt", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const link = page.getByRole("link", { name: "Mehr über mich" });
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await page.waitForTimeout(1500);
    // Oberes Band des Bildschirms: Dort zeigt der Vorhang anfangs noch die alte Seite, genau wie vor dem Klick.
    const band = { x: 0, y: 90, width: 900, height: 300 };
    const before = await page.screenshot({ clip: band });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
    await link.click();
    await page.waitForFunction(() => document.documentElement.matches(":active-view-transition"));
    await page.waitForTimeout(1500);
    const during = await page.screenshot({ clip: band });
    expect(await difference(page, before, during)).toBeLessThan(0.02);
  });

  test("Bewegung: ein Formular in der Seite löst keinen Vorhang aus", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/kunden");
    await page.evaluate(countTransitions);
    await page.getByLabel("Galerie-Code").fill("gibt-es-nicht");
    await page.getByRole("button", { name: "Galerie öffnen" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    expect(await page.evaluate(transitions)).toBe(0);
  });
});
