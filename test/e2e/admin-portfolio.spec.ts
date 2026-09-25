import { expect, test, type Page } from "@playwright/test";
import { ADMIN_STATE, clearCategory } from "./helpers/admin";
import { makeJpeg, withExifOrientation } from "./helpers/images";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STATE });

const cards = (page: Page) => page.getByTestId("portfolio-image");

/** Führt eine Aktion aus und wartet auf die zugehörige Portfolio-API-Antwort (keine überholenden Requests). */
async function andWait(page: Page, method: "PATCH" | "PUT", action: () => Promise<void>) {
  const response = page.waitForResponse((r) => r.url().includes("/admin/api/portfolio") && r.request().method() === method);
  await action();
  expect((await response).ok()).toBe(true);
}

async function upload(page: Page, files: { name: string; buffer: Buffer }[]) {
  await page.getByLabel("Bilder hinzufügen").setInputFiles(files.map((f) => ({ ...f, mimeType: "image/jpeg" })));
  await expect(page.locator('[data-testid="upload-item"][data-status="done"]')).toHaveCount(files.length, { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await clearCategory(page, "studio");
  await page.goto("/admin/portfolio/studio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio");
});

test("Bilder hochladen: erscheinen in Reihenfolge, Vorschau lädt, sichtbar", async ({ page }) => {
  await upload(page, [
    { name: "a.jpg", buffer: await makeJpeg(page, 3000, 2000, "#b3261e") },
    { name: "b.jpg", buffer: await makeJpeg(page, 2000, 3000, "#1e3a8a") },
  ]);
  await expect(cards(page)).toHaveCount(2);
  const first = cards(page).first().locator("img");
  await expect(first).toHaveJSProperty("complete", true);
  expect(await first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(cards(page).first().getByLabel("Sichtbar")).toBeChecked();

  await page.reload();
  await expect(cards(page)).toHaveCount(2);
});

test("EXIF-gedrehtes Foto wird aufrecht gespeichert und nie vergrößert", async ({ page }) => {
  const landscapePixels = await makeJpeg(page, 600, 300, "#0f766e");
  await upload(page, [{ name: "hochkant.jpg", buffer: withExifOrientation(landscapePixels, 6) }]);
  const card = cards(page).first();
  await expect(card).toHaveAttribute("data-width", "300");
  await expect(card).toHaveAttribute("data-height", "600");

  const id = await card.getAttribute("data-id");
  const size = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, `/media/portfolio/${id}/2400`);
  expect(size).toEqual([300, 600]);
});

test("Reihenfolge, Sichtbarkeit, Rollen und Löschen bleiben nach dem Neuladen erhalten", async ({ page }) => {
  await upload(page, [
    { name: "eins.jpg", buffer: await makeJpeg(page, 900, 600, "#111111") },
    { name: "zwei.jpg", buffer: await makeJpeg(page, 900, 600, "#222222") },
  ]);
  const [idOne, idTwo] = await cards(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-id")));

  await andWait(page, "PUT", () => cards(page).first().getByRole("button", { name: "Nach hinten" }).click());
  await expect(cards(page).first()).toHaveAttribute("data-id", idTwo!);

  await andWait(page, "PATCH", () => cards(page).first().getByLabel("Sichtbar").uncheck());
  await andWait(page, "PATCH", async () => {
    await cards(page).first().getByLabel("Rolle").selectOption({ label: "Kapitel-Bild" });
  });
  await andWait(page, "PATCH", async () => {
    await cards(page).nth(1).getByLabel("Rolle").selectOption({ label: "Kapitel-Bild" });
  });
  await cards(page).nth(1).getByLabel("Alt-Text DE").fill("Studio-Porträt");
  await andWait(page, "PATCH", () => cards(page).nth(1).getByLabel("Alt-Text DE").blur());
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  await page.reload();
  await expect(cards(page).first()).toHaveAttribute("data-id", idTwo!);
  await expect(cards(page).first().getByLabel("Sichtbar")).not.toBeChecked();
  await expect(cards(page).first().getByLabel("Rolle")).toHaveValue("");
  await expect(cards(page).nth(1).getByLabel("Rolle")).toHaveValue("chapter");
  await expect(cards(page).nth(1).getByLabel("Alt-Text DE")).toHaveValue("Studio-Porträt");

  page.once("dialog", (dialog) => dialog.accept());
  await cards(page).nth(1).getByRole("button", { name: "Löschen" }).click();
  await expect(cards(page)).toHaveCount(1);
  expect((await page.request.get(`/media/portfolio/${idOne}/800`)).status()).toBe(404);
});

test("Übersicht zählt die Bilder pro Kategorie", async ({ page }) => {
  await upload(page, [{ name: "x.jpg", buffer: await makeJpeg(page, 400, 400, "#444444") }]);
  await page.goto("/admin");
  await expect(page.getByRole("main").getByRole("link", { name: /Studio/ })).toContainText("1 sichtbar · 1 gesamt");
});
