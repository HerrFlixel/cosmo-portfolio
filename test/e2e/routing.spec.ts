import { expect, test } from "@playwright/test";

const pathOf = (url: string) => new URL(url).pathname;

test.describe("Deutsch (Standard, ohne Präfix)", () => {
  test("Startseite ist deutsch und bleibt auf /", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    expect(pathOf(page.url())).toBe("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallen, Rauch, Gänsehaut.");
  });

  test("Kategorien und Seiten haben deutsche Pfade", async ({ page }) => {
    const cases = [
      ["/floorball", "Floorball"],
      ["/volleyball", "Volleyball"],
      ["/fussball", "Fußball"],
      ["/hochzeiten", "Hochzeiten"],
      ["/studio", "Studio"],
      ["/ueber-mich", "Über mich"],
      ["/kontakt", "Kontakt"],
      ["/kunden", "Kundenbereich"],
      ["/impressum", "Impressum"],
      ["/datenschutz", "Datenschutz"],
    ] as const;
    for (const [path, title] of cases) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    }
  });

  test("/de-Präfix wird entfernt", async ({ page }) => {
    await page.goto("/de/floorball");
    expect(pathOf(page.url())).toBe("/floorball");
  });

  test("Sprachumschalter führt zur englischen Startseite", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("Englisch", () => {
  test("lokalisierte Pfade", async ({ page }) => {
    const cases = [
      ["/en/floorball", "Floorball"],
      ["/en/football", "Football"],
      ["/en/weddings", "Weddings"],
      ["/en/about", "About"],
      ["/en/contact", "Contact"],
      ["/en/clients", "Clients"],
      ["/en/imprint", "Imprint"],
      ["/en/privacy", "Privacy"],
    ] as const;
    for (const [path, title] of cases) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    }
  });

  test("Links auf der englischen Startseite zeigen auf englische Pfade", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Football" })).toHaveAttribute("href", "/en/football");
    await expect(page.getByRole("link", { name: "Weddings" })).toHaveAttribute("href", "/en/weddings");
    await expect(page.getByRole("link", { name: "About" })).toHaveAttribute("href", "/en/about");
  });
});

test.describe("Spracherkennung", () => {
  test.use({ locale: "en-US" });

  test("englischer Browser landet von / auf /en", async ({ page }) => {
    await page.goto("/");
    expect(pathOf(page.url())).toBe("/en");
  });
});

test.describe("Nicht lokalisierte Bereiche", () => {
  test.use({ locale: "en-US" });

  test("/admin und /g/… werden nie umgeleitet", async ({ page }) => {
    for (const path of ["/admin", "/g/test-galerie"]) {
      const res = await page.goto(path);
      expect(pathOf(page.url()), path).toBe(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("unbekannte Seiten außerhalb der Sprachen zeigen die gestaltete 404-Seite", async ({ page }) => {
    for (const path of ["/admin", "/g/vertippt", "/api/x"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
      await expect(page.getByText("404 · Seite nicht gefunden / Page not found"), path).toBeVisible();
    }
  });

  test("Dateien werden nicht umgeleitet", async ({ request }) => {
    const res = await request.get("/favicon.ico", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});

test.describe("Robust gegen seltsame URLs", () => {
  test("unbekannte Kategorie, tiefer Pfad und ß-URL geben 404 statt 500", async ({ page }) => {
    for (const path of ["/quatsch", "/en/quatsch/tief/drin", "/fu%C3%9Fball", "/xx/floorball"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("kaputte Prozent-Kodierung gibt 400 statt 500", async ({ request }) => {
    for (const path of ["/fu%DFball", "/%ff", "/g/%ff", "/admin/%ff", "/api/%ff"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(400);
    }
  });

  test("Schrägstrich am Ende führt zur Seite", async ({ page }) => {
    const res = await page.goto("/en/football/");
    expect(res?.status()).toBe(200);
    expect(pathOf(page.url())).toBe("/en/football");
  });
});
