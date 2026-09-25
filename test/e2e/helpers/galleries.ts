import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_STATE } from "./admin";
import { makeJpeg } from "./images";

/** Eindeutiger Zusatz pro Testlauf: Vorschau-Deployments behalten ihre Daten zwischen den Läufen. */
export const RUN = Date.now().toString(36);

/** Eigener Browser-Kontext (z. B. in beforeAll) mit baseURL und Sprache aus der Projekt-Konfiguration. */
export function newContext(browser: Browser, options: { admin?: boolean } = {}) {
  const { baseURL, locale } = test.info().project.use;
  return browser.newContext({ baseURL, locale, ...(options.admin ? { storageState: ADMIN_STATE } : {}) });
}

/** Legt über den Admin eine Galerie an und liefert id und Kurznamen. */
export async function createGalleryViaUi(page: Page, title: string): Promise<{ id: string; slug: string }> {
  await page.goto("/admin/galerien");
  await page.getByLabel("Titel").fill(title);
  await page.getByRole("button", { name: "Galerie anlegen" }).click();
  await expect(page).toHaveURL(/\/admin\/galerien\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").at(-1)!;
  const slug = (await page.getByTestId("gallery-link").textContent())!.split("/g/")[1];
  return { id, slug };
}

export async function galleryPassword(page: Page): Promise<string> {
  return (await page.getByTestId("gallery-password").textContent()) ?? "";
}

/** Lädt kleine Test-JPEGs über die Upload-Fläche der Detailseite hoch und wartet, bis alle fertig sind. */
export async function uploadJpegs(page: Page, names: string[]): Promise<void> {
  const colors = ["#aa3333", "#33aa33", "#3333aa", "#888833"];
  const files = [];
  for (const [index, name] of names.entries()) {
    const portrait = index % 2 === 1;
    const buffer = await makeJpeg(page, portrait ? 800 : 1200, portrait ? 1200 : 800, colors[index % colors.length]);
    files.push({ name, mimeType: "image/jpeg", buffer });
  }
  await page.getByLabel("Bilder hinzufügen").setInputFiles(files);
  await expect(page.locator('[data-testid="upload-item"][data-status="done"]')).toHaveCount(names.length, { timeout: 30_000 });
}

export async function publishGallery(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByTestId("gallery-status")).toHaveText("Online");
}

/** Öffnet eine (nicht leere) Galerie als Kunde. */
export async function unlockGallery(page: Page, slug: string, password: string): Promise<void> {
  await page.goto(`/g/${slug}`);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByTestId("gallery-grid")).toBeVisible();
}
