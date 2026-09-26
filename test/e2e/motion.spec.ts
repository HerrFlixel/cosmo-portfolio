import { expect, test, type Page } from "@playwright/test";
import { difference, lowestInk } from "./helpers/pixels";

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
    const curtain = page.locator("[data-intro-curtain]");
    await expect(html).toHaveAttribute("data-intro", "running");
    // „Seite zuerst“: Die Startseite ist schon gezeichnet und liegt unter dem Vorhang (das LCP wartet nicht aufs Intro).
    await expect(curtain).toBeVisible();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading.locator(".reveal-line")).toHaveCount(0);
    await expect(page.locator("[data-site-logo] [data-logo-photos]")).toBeAttached();
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 6000 });
    await expect(curtain).toBeHidden();
    await expect
      .poll(() => page.locator("[data-site-logo]").evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await page.reload();
    await expect(html).not.toHaveAttribute("data-intro", /pending|running/);
    await expect(heading).toBeVisible();
  });

  test("Bewegung: ohne JavaScript deckt der Vorhang höchstens 4 s, dann ist die Seite da", async ({ page }) => {
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-intro", "pending");
    await expect(page.locator("[data-intro-curtain]")).toBeVisible();
    await expect(page.locator("[data-intro-curtain]")).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-site-logo]")).toBeVisible();
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

  test("Bewegung: Überschriften im ersten Bildschirm sind sofort da, schon vor der Hydration, ohne Zerlegen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    // Ohne Next-Skripte (keine Hydration): Nur CSS und das Inline-Boot-Skript wirken.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/ueber-mich");
    await expect(page.locator("html")).toHaveClass(/has-motion/);
    expect(await page.locator("main p[data-reveal]").evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
    await page.unroute("**/_next/static/**/*.js");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await expect(page.locator("main p[data-reveal] .reveal-line")).toHaveCount(0);
  });

  test("Bewegung: weiter unten erscheinen Überschriften Zeile für Zeile hinter einer Maske", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser
    const lines = statement.locator(".reveal-line");
    await expect(lines.first()).toBeAttached();
    await statement.scrollIntoViewIfNeeded();
    await expect
      .poll(() => lines.first().evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
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

test("Bewegung: Unterlängen bleiben nach dem Zeilen-Reveal vollständig (wie ohne Bewegung)", async ({ browser }) => {
  const measure = async (motion: "reduce" | "no-preference") => {
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      locale: "de-DE",
      reducedMotion: motion,
      viewport: { width: 1280, height: 480 },
    });
    await context.addInitScript(skipIntro);
    const page: Page = await context.newPage();
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser, unterhalb des ersten Bildschirms
    await statement.scrollIntoViewIfNeeded();
    if (motion === "no-preference") {
      const line = statement.locator(".reveal-line").first();
      await expect(line).toBeAttached();
      await expect.poll(() => line.evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    }
    const box = (await statement.boundingBox())!;
    const text = (await statement.innerText()).replace(/\s+/g, " ").trim();
    const row = await lowestInk(page, { x: box.x, y: box.y, width: box.width, height: box.height + 40 });
    await context.close();
    return { text, row };
  };
  // Der Teaser-Text kommt aus den Einstellungen; parallel laufende Admin-Tests können ihn ändern → gleiches Paar abwarten.
  await expect(async () => {
    const moving = await measure("no-preference");
    const still = await measure("reduce");
    expect(moving.text).toBe(still.text);
    expect(Math.abs(moving.row - still.row)).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 30_000 });
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

  test("Bewegung: das Handy-Menü lässt sich scrollen, wenn es höher als der Bildschirm ist", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 500 });
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await page.getByRole("button", { name: "Menü" }).click();
    const menu = page.locator("#mobile-menu");
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    expect(await menu.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await page.mouse.move(180, 300);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
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
    // Unter Last kann das weiche Scrollen noch laufen: erst messen, wenn die Position eine Weile steht.
    await expect
      .poll(async () => {
        const first = await page.evaluate(() => window.scrollY);
        await page.waitForTimeout(300);
        return (await page.evaluate(() => window.scrollY)) - first;
      })
      .toBe(0);
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

test.describe("Barrierefreiheit und Sprache mit Bewegung", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: zerlegte Absätze bleiben für Screenreader lesbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser, zerlegt
    await expect(statement.locator(".reveal-line").first()).toBeAttached();
    const firstWord = (await statement.textContent())!.trim().split(/\s+/)[0];
    expect(await page.locator("main").ariaSnapshot()).toContain(`paragraph: ${firstWord}`);
  });

  test("Bewegung: nach dem Sprachwechsel bleibt die Bewegung an", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.getByRole("banner").getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.locator("html")).toHaveClass(/has-motion/);
    await expect(page.locator("html")).toHaveClass(/lenis/);
  });
});
