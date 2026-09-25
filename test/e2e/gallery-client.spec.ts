import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { RUN, createGalleryViaUi, galleryPassword, newContext, publishGallery, unlockGallery, uploadJpegs } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });

const TITLE = `Kunden Ümlaut ${RUN}`;
let slug = "";
let password = "";

test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  ({ slug } = await createGalleryViaUi(page, TITLE));
  password = await galleryPassword(page);
  await uploadJpegs(page, ["Größe 1.jpg", "IMG_0002.jpg", "IMG_0003.jpg"]);
  await publishGallery(page);
  await admin.close();
});

test("Passwortseite zeigt den Titel, falsches Passwort wird abgelehnt", async ({ page }) => {
  const response = await page.goto(`/g/${slug}`);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
  await page.getByLabel("Passwort").fill("falsch-falsch-00");
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Falsches Passwort.");
});

test("mit Passwort: Raster, Lightbox per Tastatur, Original-Download", async ({ page }) => {
  await unlockGallery(page, slug, password);
  const thumbs = page.getByTestId("gallery-thumb");
  await expect(thumbs).toHaveCount(3);
  await expect(page.getByText("3 Bilder")).toBeVisible();

  await thumbs.first().click();
  const lightbox = page.getByTestId("lightbox");
  await expect(lightbox.getByText("1 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(lightbox.getByText("2 / 3")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    lightbox.getByRole("link", { name: "Original herunterladen" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("IMG_0002.jpg");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(thumbs.first()).toBeFocused();
});

test("ZIP: exakte Länge, besteht unzip -t mit allen Dateien", async ({ page }) => {
  await unlockGallery(page, slug, password);
  const href = await page.getByTestId("download-all").first().getAttribute("href");
  expect(href).toBe(`/g/${slug}/zip?set=all`);
  const zip = await page.request.get(href!);
  expect(zip.status()).toBe(200);
  const body = await zip.body();
  expect(body.length).toBe(Number(zip.headers()["content-length"]));
  const file = join(mkdtempSync(join(tmpdir(), "cosmo-zip-")), "galerie.zip");
  writeFileSync(file, body);
  const report = execFileSync("unzip", ["-t", file]).toString();
  expect(report).toContain("No errors detected");
  expect(report.match(/\bOK\b/g)).toHaveLength(3);
  expect(report).toContain("IMG_0003.jpg");
});

test("Sprache: Umschalter auf Englisch", async ({ page }) => {
  await page.goto(`/g/${slug}`);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Entwurf ist unsichtbar (404), abgelaufene Galerie zeigt einen freundlichen Hinweis", async ({ browser, page }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const draft = await createGalleryViaUi(adminPage, `Entwurf ${RUN}`);
  const expired = await createGalleryViaUi(adminPage, `Abgelaufen ${RUN}`);
  await adminPage.getByLabel("Online bis").fill("2020-01-01");
  await adminPage.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(adminPage.getByTestId("gallery-expiry")).toHaveText("01.01.2020");
  await adminPage.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(adminPage.getByTestId("gallery-status")).toHaveText("Abgelaufen");
  await admin.close();

  expect((await page.goto(`/g/${draft.slug}`))?.status()).toBe(404);
  await page.goto(`/g/${expired.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diese Galerie ist abgelaufen.");
  await expect(page.getByRole("link", { name: "Kontakt" })).toHaveAttribute("href", "/kontakt");
});
