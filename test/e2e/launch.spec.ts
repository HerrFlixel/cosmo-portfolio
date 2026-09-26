import { expect, test } from "@playwright/test";

// Nur auf Zuruf gegen die Produktion (npm run test:launch): Ist alles da, was Besucher sehen? Voraussetzung für Task 13.
const CATEGORIES = [
  ["floorball", "Floorball"],
  ["volleyball", "Volleyball"],
  ["fussball", "Fußball"],
  ["hochzeiten", "Hochzeiten"],
  ["studio", "Studio"],
] as const;

test("Launch: Startseite mit Hero-Bildern", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-intro='collage'] img").first()).toBeVisible();
});

for (const [slug, name] of CATEGORIES) {
  test(`Launch: ${name} hat Bilder`, async ({ page }) => {
    await page.goto(`/${slug}`);
    await expect(page.getByText("Hier kommen bald Bilder.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: `${name}, Foto 1` })).toBeVisible();
  });
}

test("Launch: Über mich mit Porträt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("main .passepartout img")).toHaveCount(1);
});

test("Launch: Impressum und Datenschutz sind ausgefüllt", async ({ page }) => {
  for (const path of ["/impressum", "/datenschutz"]) {
    await page.goto(path);
    await expect(page.getByText("Dieser Text folgt in Kürze."), path).toHaveCount(0);
  }
});

test("Launch: Kontaktformular ist aktiv (Secrets gesetzt)", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("button", { name: "Nachricht senden" })).toBeVisible();
  await expect(page.locator('input[name="turnstile"]')).toBeAttached();
});

test("Launch: Instagram und Shop sind verlinkt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href*="instagram.com"]').first()).toBeAttached();
  await expect(page.locator('a[href*="pictrs"]').first()).toBeAttached();
});
