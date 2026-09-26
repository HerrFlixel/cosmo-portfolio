import { expect, test, type Page } from "@playwright/test";

const SITE = "https://cosmo-photos.de";

const headOf = (page: Page) => ({
  canonical: () => page.locator('head link[rel="canonical"]').getAttribute("href"),
  alternate: (lang: string) => page.locator(`head link[rel="alternate"][hreflang="${lang}"]`).getAttribute("href"),
  property: (name: string) => page.locator(`head meta[property="${name}"]`).first().getAttribute("content"),
  description: () => page.locator('head meta[name="description"]').getAttribute("content"),
});

test("Suchmaschinen: Startseite mit Canonical, hreflang, Open Graph und strukturierten Daten", async ({ page }) => {
  await page.goto("/");
  const head = headOf(page);
  expect(await head.canonical()).toBe(SITE);
  expect(await head.alternate("de")).toBe(SITE);
  expect(await head.alternate("en")).toBe(`${SITE}/en`);
  expect(await head.alternate("x-default")).toBe(SITE);
  expect(await head.property("og:locale")).toBe("de_DE");
  expect(await head.property("og:image")).toMatch(/^https:\/\/cosmo-photos\.de\//);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data).toMatchObject({ "@type": "Person", name: "Felix Vatterodt", address: { addressLocality: "Hamburg" } });
});

test("Suchmaschinen: englische Kategorie mit lokalisiertem Pfad und deutschem Gegenstück", async ({ page }) => {
  await page.goto("/en/weddings");
  const head = headOf(page);
  expect(await head.canonical()).toBe(`${SITE}/en/weddings`);
  expect(await head.alternate("de")).toBe(`${SITE}/hochzeiten`);
  expect(await head.property("og:locale")).toBe("en_US");
  expect(await head.description()).toBe("Wedding photography from Hamburg by Felix Vatterodt.");
  expect(await page.title()).toBe("Weddings · Cosmo Photos");
});

test("Suchmaschinen: Sitemap mit beiden Sprachen, robots.txt passend zur Adresse", async ({ request, baseURL }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`<loc>${SITE}/en/weddings</loc>`);
  expect(sitemap).toContain(`hreflang="de" href="${SITE}/hochzeiten"`);
  expect(sitemap).not.toContain("/g/");
  const robots = await (await request.get("/robots.txt")).text();
  if (new URL(baseURL!).host === "cosmo-photos.de") {
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  } else {
    expect(robots).toMatch(/^Disallow: \/\s*$/m);
  }
  const old = await request.get("/wp-sitemap.xml");
  expect(new URL(old.url()).pathname).toBe("/sitemap.xml");
});
