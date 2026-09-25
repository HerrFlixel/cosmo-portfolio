import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./helpers/admin";
import { RUN, createGalleryViaUi, galleryPassword, publishGallery, uploadJpegs } from "./helpers/galleries";

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

test("Bilder hochladen (nach Dateiname sortiert), Titelbild, veröffentlichen, Nachricht", async ({ page }) => {
  const { slug } = await createGalleryViaUi(page, `Upload ${RUN}`);
  await uploadJpegs(page, ["IMG_0002.jpg", "IMG_0001.jpg"]);
  await page.reload();
  const images = page.getByTestId("gallery-image");
  await expect(images).toHaveCount(2);
  await expect(images.first()).toContainText("IMG_0001.jpg");
  await expect(page.getByText("2 Bilder ·")).toBeVisible();

  await images.nth(1).getByRole("button", { name: "Als Titelbild" }).click();
  await expect(images.nth(1).getByTestId("cover-badge")).toBeVisible();
  await page.reload();
  await expect(images.nth(1).getByTestId("cover-badge")).toBeVisible();

  await publishGallery(page);
  const message = page.getByLabel("Nachricht");
  await expect(message).toHaveValue(new RegExp(`/g/${slug}\\n`));
  await expect(message).toHaveValue(/Passwort: [a-z]+-[a-z]+-\d\d/);
  await page.getByLabel("Sprache").selectOption("en");
  await expect(message).toHaveValue(/Password: /);
});

test("Einstellungen, Ablauf, Passwort, Bild entfernen, Galerie löschen", async ({ page }) => {
  const title = `Pflege ${RUN}`;
  await createGalleryViaUi(page, title);
  await uploadJpegs(page, ["a.jpg"]);

  await page.getByLabel("Kurzname").fill(`pflege-neu-${RUN}`);
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByTestId("gallery-link")).toHaveText(new RegExp(`/g/pflege-neu-${RUN}$`));

  await page.getByLabel("Online bis").fill("");
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Bitte ein Datum wählen oder „Unbegrenzt online“ ankreuzen.");

  await page.getByLabel("Unbegrenzt online").check();
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByTestId("gallery-expiry")).toHaveText("unbegrenzt");
  await page.getByRole("button", { name: "Um 30 Tage verlängern" }).click();
  await expect(page.getByTestId("gallery-expiry")).toHaveText(/^\d\d\.\d\d\.\d{4}$/);

  await page.getByLabel("Neues Passwort").fill("eigenes-passwort-1");
  await page.getByRole("button", { name: "Passwort setzen" }).click();
  await expect(page.getByTestId("gallery-password")).toHaveText("eigenes-passwort-1");
  await page.getByRole("button", { name: "Neues Passwort erzeugen" }).click();
  await expect(page.getByTestId("gallery-password")).toHaveText(/^[a-z]+-[a-z]+-\d\d$/);
  expect(await galleryPassword(page)).not.toBe("eigenes-passwort-1");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("gallery-image").first().getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByTestId("gallery-image")).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Galerie löschen" }).click();
  await expect(page).toHaveURL(/\/admin\/galerien$/);
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
});
