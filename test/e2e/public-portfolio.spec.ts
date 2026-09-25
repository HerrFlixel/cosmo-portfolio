import { expect, test } from "@playwright/test";
import { newContext } from "./helpers/galleries";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });

// Eigene Kategorie für diese Datei (admin-api nutzt volleyball, admin-portfolio studio):
// 6 sichtbare Bilder (1 Kapitel, 3 Vorschau), 1 ausgeblendetes.
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await seedCategory(page, "hochzeiten", [
    { role: "chapter" },
    { role: "chapter_preview" },
    { role: "chapter_preview", portrait: true },
    { role: "chapter_preview" },
    {},
    { portrait: true },
    { visible: false },
  ]);
  await admin.close();
});

test("Startseite: Index mit Anzahl, Kapitel mit Bild, Vorschau und Link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallen, Rauch, Gänsehaut.");

  const index = page.getByRole("navigation", { name: "Kategorien" });
  const entry = index.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Hochzeiten", exact: true }) });
  await expect(entry).toContainText("(6)");

  const chapter = page.locator('[data-chapter="hochzeiten"]');
  await expect(chapter.getByRole("heading", { level: 2 })).toHaveText("Hochzeiten");
  await expect(chapter).toContainText("(6 Fotos)");
  expect(await chapter.locator(".bg-hall").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");
  await expect(chapter.getByRole("listitem")).toHaveCount(3);
  await expect(chapter.getByRole("img", { name: /^Hochzeiten, Foto/ })).toHaveCount(4);

  await chapter.getByRole("link", { name: "Alle Hochzeiten-Bilder" }).click();
  await expect(page).toHaveURL(/\/hochzeiten$/);
});
