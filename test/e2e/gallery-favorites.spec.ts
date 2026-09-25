import { expect, test, type Page } from "@playwright/test";
import { RUN, createGalleryViaUi, galleryPassword, newContext, publishGallery, unlockGallery, uploadJpegs } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });

let slug = "";
let galleryId = "";
let password = "";

/** Das Herz zeigt sofort an; gespeichert ist erst nach der Antwort (sonst bricht ein Neuladen die Anfrage ab). */
const saved = (page: Page) => page.waitForResponse((r) => r.url().includes("/api/favorites") && r.request().method() === "POST" && r.status() === 204);

test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  ({ slug, id: galleryId } = await createGalleryViaUi(page, `Favoriten ${RUN}`));
  password = await galleryPassword(page);
  await uploadJpegs(page, ["IMG_2041.jpg", "IMG_2042.jpg", "IMG_2077.jpg"]);
  await publishGallery(page);
  await admin.close();
});

test("Name beim ersten Herz, Auswahl bleibt nach Neuladen, Filter und Favoriten-ZIP", async ({ page }) => {
  await unlockGallery(page, slug, password);
  await page.getByRole("button", { name: "Als Favorit markieren" }).first().click();
  await page.getByRole("textbox", { name: "Wie heißt du?" }).fill("  Anna  ");
  await Promise.all([saved(page), page.getByRole("button", { name: "Weiter" }).click()]);
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(1);
  await Promise.all([saved(page), page.getByRole("button", { name: "Als Favorit markieren" }).last().click()]);
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(2);

  await page.reload();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(2);

  await page.getByRole("button", { name: "Nur Favoriten" }).click();
  await expect(page.getByTestId("gallery-thumb")).toHaveCount(2);

  const zip = await page.request.get((await page.getByTestId("download-favorites").first().getAttribute("href"))!);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-disposition"]).toContain("_Favoriten.zip");
});

test("der Admin sieht die Auswahl mit Dateinamen und die Zeitleiste", async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await page.goto(`/admin/galerien/${galleryId}`);
  const panel = page.getByTestId("favorites-panel");
  await expect(panel).toContainText("Anna");
  await expect(panel.getByLabel("Dateinamen für Lightroom")).toHaveValue("IMG_2041, IMG_2077");
  const events = page.getByTestId("events-panel");
  await expect(events).toContainText("Favorit gesetzt");
  await expect(events).toContainText("ZIP geladen");
  await expect(events).toContainText("Galerie geöffnet");
  await admin.close();
});

test("eine zweite Person hat eine eigene Auswahl; zu lange Namen werden gekürzt", async ({ browser }) => {
  const other = await newContext(browser);
  const page = await other.newPage();
  await unlockGallery(page, slug, password);
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Als Favorit markieren" }).first().click();
  await page.getByRole("textbox", { name: "Wie heißt du?" }).fill("x".repeat(60));
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(1);
  await other.close();
});
