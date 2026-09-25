import { expect, test } from "@playwright/test";
import { RUN, createGalleryViaUi, newContext, publishGallery } from "./helpers/galleries";

test("Über mich: Titel, Statement und Weg zum Kontakt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Über mich");
  await expect(page.getByRole("main").locator(".font-display").first()).not.toBeEmpty();
  await page.getByRole("main").getByRole("link", { name: "Schreib mir" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
});

test("Impressum und Datenschutz: Titel und Text bzw. Hinweis, auch auf Englisch", async ({ page }) => {
  for (const [path, title] of [
    ["/impressum", "Impressum"],
    ["/datenschutz", "Datenschutz"],
    ["/en/imprint", "Imprint"],
    ["/en/privacy", "Privacy"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    await expect(page.getByRole("main").locator("p").first(), path).not.toBeEmpty();
  }
});

test("Kundenbereich: leerer und unbekannter Code werden erklärt", async ({ page }) => {
  await page.goto("/kunden");
  const code = page.getByLabel("Galerie-Code");
  const open = page.getByRole("button", { name: "Galerie öffnen" });
  await code.fill("***");
  await open.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Bitte gib einen Galerie-Code ein.");
  await expect(code).toHaveValue("***");
  await code.fill(`gibt-es-nicht-${RUN}`);
  await open.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Diese Galerie gibt es nicht. Prüf den Code in deiner Nachricht.");
});

test("Kundenbereich: Code oder Link führt zur Galerie", async ({ browser, page }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const { slug } = await createGalleryViaUi(adminPage, `Code ${RUN}`);
  await publishGallery(adminPage);
  await admin.close();

  await page.goto("/kunden");
  await page.getByLabel("Galerie-Code").fill(`  ${slug.toUpperCase()} `);
  await page.getByRole("button", { name: "Galerie öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Code ${RUN}`);

  await page.goto("/en/clients");
  await page.getByLabel("Gallery code").fill(`https://cosmo-photos.de/g/${slug}`);
  await page.getByRole("button", { name: "Open gallery" }).click();
  await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
});
