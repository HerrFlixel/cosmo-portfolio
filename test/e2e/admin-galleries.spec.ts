import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./helpers/admin";
import { RUN, createGalleryViaUi, galleryPassword } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STATE });

test("neue Galerie: Entwurf mit Kurzname, Passwort und Ablaufdatum", async ({ page }) => {
  const title = `Hochzeit Müller & Groß ${RUN}`;
  const { slug } = await createGalleryViaUi(page, title);
  expect(slug).toBe(`hochzeit-mueller-gross-${RUN}`);
  await expect(page.getByTestId("gallery-status")).toHaveText("Entwurf");
  await expect(page.getByTestId("gallery-expiry")).toHaveText(/^\d\d\.\d\d\.\d{4}$/);
  expect(await galleryPassword(page)).toMatch(/^[a-z]+-[a-z]+-\d\d$/);

  await page.goto("/admin/galerien");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toContainText("Entwurf");
  await expect(row).toContainText("0 Bilder");
});

test("leerer Titel wird abgelehnt", async ({ page }) => {
  await page.goto("/admin/galerien");
  await page.getByLabel("Titel").fill("   ");
  await page.getByRole("button", { name: "Galerie anlegen" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Der Titel braucht 1–120 Zeichen.");
});
