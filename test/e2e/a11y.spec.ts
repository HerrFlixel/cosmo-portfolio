import { expect, test } from "@playwright/test";
import { expectNoViolations } from "./helpers/a11y";
import { createGalleryViaUi, galleryPassword, newContext, publishGallery, RUN, unlockGallery, uploadJpegs } from "./helpers/galleries";

for (const path of ["/", "/en", "/ueber-mich", "/kontakt", "/kunden", "/impressum", "/datenschutz", "/en/about", "/en/contact", "/gibt-es-nicht"]) {
  test(`Barrierefreiheit (axe): ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page, path);
  });
}

test("Barrierefreiheit (axe): Kundengalerie (Passwortseite und Galerie), Feldlinie wie auf den öffentlichen Seiten", async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const { slug } = await createGalleryViaUi(adminPage, `A11y ${RUN}`);
  await uploadJpegs(adminPage, ["a11y-1.jpg", "a11y-2.jpg"]);
  await publishGallery(adminPage);
  const password = await galleryPassword(adminPage);
  await admin.close();

  const guest = await newContext(browser);
  const page = await guest.newPage();
  await page.goto("/kunden");
  const publicLine = await page.getByLabel("Galerie-Code").evaluate((element) => getComputedStyle(element).borderBottomColor);
  await page.goto(`/g/${slug}`);
  expect(await page.getByLabel("Passwort").evaluate((element) => getComputedStyle(element).borderBottomColor)).toBe(publicLine);
  await expectNoViolations(page, "Passwortseite");
  await unlockGallery(page, slug, password);
  await expectNoViolations(page, "Galerie");
  await guest.close();
});
