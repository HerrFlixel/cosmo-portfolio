import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./helpers/admin";
import { makeJpeg } from "./helpers/images";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/texte");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Texte & Links");
});

test("Texte speichern und nach dem Neuladen wiederfinden", async ({ page }) => {
  await page.getByLabel("Hero-Headline (DE)").fill("Hallen, Rauch, Gänsehaut.");
  await page.getByLabel("Kontakt-E-Mail").fill("hallo@cosmo-photos.de");
  await page.getByLabel("Referenzen").fill("ETV Hamburg\nFZ17\nUnihoc");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  await page.reload();
  await expect(page.getByLabel("Hero-Headline (DE)")).toHaveValue("Hallen, Rauch, Gänsehaut.");
  await expect(page.getByLabel("Referenzen")).toHaveValue("ETV Hamburg\nFZ17\nUnihoc");
});

test("ungültige Eingaben zeigen Fehler am Feld", async ({ page }) => {
  await page.getByLabel("Kontakt-E-Mail").fill("keine-mail");
  await page.getByLabel("Instagram").fill("http://instagram.com/x");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Keine gültige E-Mail-Adresse.")).toBeVisible();
  await expect(page.getByText("Bitte eine vollständige https-Adresse angeben.")).toBeVisible();
});

test("Porträt hochladen, speichern und behalten", async ({ page }) => {
  const portrait = await makeJpeg(page, 1200, 1800, "#334155");
  await page.getByLabel("Porträt wählen").setInputFiles({ name: "felix.jpg", mimeType: "image/jpeg", buffer: portrait });
  await expect(page.getByRole("img", { name: "Porträt-Vorschau" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  await page.reload();
  const preview = page.getByRole("img", { name: "Porträt-Vorschau" });
  await expect(preview).toHaveAttribute("src", /^\/media\/site\/[0-9a-f-]{36}\/800$/);
  // Über mich (Plan 6): Das Porträt ist dort oft das größte Element (LCP) und lädt deshalb sofort.
  await page.goto("/ueber-mich");
  const portraitImage = page.locator("main .passepartout img");
  await expect(portraitImage).toHaveAttribute("loading", "eager");
  await expect(portraitImage).toHaveAttribute("fetchpriority", "high");
});
