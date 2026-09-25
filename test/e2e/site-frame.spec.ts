import { expect, test } from "@playwright/test";

test("Rahmen: Kopf mit Logo und Navigation, Sprache wechselt auf derselben Seite", async ({ page }) => {
  await page.goto("/fussball");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Cosmo Photos, zur Startseite" })).toHaveAttribute("href", "/");
  await expect(banner.getByRole("link", { name: "Über mich" })).toHaveAttribute("href", "/ueber-mich");
  await expect(banner.getByRole("link", { name: "Arbeiten" })).toHaveAttribute("href", "/#arbeiten");
  await banner.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/football$/);
  // next-intl verlinkt die Standardsprache mit /de/…, die Middleware speichert die Wahl und leitet auf /fussball weiter.
  await page.getByRole("banner").getByRole("link", { name: "Deutsch" }).click();
  await expect(page).toHaveURL(/\/fussball$/);
});

test("Rahmen: Menü auf dem Handy öffnet als Dialog und gibt den Fokus zurück", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menü" });
  await button.click();
  const menu = page.getByRole("dialog", { name: "Menü" });
  await expect(menu.getByRole("link", { name: /Studio$/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Schließen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "Kontakt" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Rahmen: Fußzeile mit Lockup, Impressum und Datenschutz", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("img", { name: "Cosmo Photos" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/impressum");
  await expect(footer.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/datenschutz");
});

test("Rahmen: gestaltete 404 in der Sprache der Seite", async ({ page }) => {
  // Unbekannte Kategorie-Ebene → lokalisierte 404 im Seitenrahmen (tiefere Pfade zeigen die globale 404).
  const response = await page.goto("/en/quatsch");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("main").getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  await expect(page.getByRole("banner")).toBeVisible();
});

test("Rahmen: Sprunglink führt zum Inhalt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inhalt")).toBeFocused();
});
