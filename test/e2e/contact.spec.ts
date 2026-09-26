import { expect, test } from "@playwright/test";

// Turnstile mit den öffentlichen Testschlüsseln (besteht immer, lädt aber das Skript von Cloudflare).
test("Kontakt: Fehler am Feld, Eingaben bleiben, dann Versand mit Sicherheitsprüfung", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kontakt");
  const token = page.locator('input[name="turnstile"]');

  await page.getByLabel("Name", { exact: true }).fill("Anna Keller");
  await page.getByLabel("E-Mail", { exact: true }).fill("anna@example.org");
  await page.getByText("Hochzeit", { exact: true }).click();
  await page.getByLabel("Nachricht", { exact: true }).fill("kurz");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  await page.getByRole("button", { name: "Nachricht senden" }).click();

  await expect(page.getByText("Deine Nachricht ist etwas kurz (mindestens 10 Zeichen).")).toBeVisible();
  await expect(page.getByLabel("Nachricht", { exact: true })).toHaveAttribute("aria-invalid", "true");
  // Screenreader: Der Fokus springt ins erste fehlerhafte Feld, dessen Fehlertext per aria-describedby vorgelesen wird.
  await expect(page.getByLabel("Nachricht", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Anna Keller");
  await expect(page.getByRole("radio", { name: "Hochzeit" })).toBeChecked();

  await page.getByLabel("Nachricht", { exact: true }).fill("Wir heiraten im Juni in Hamburg und suchen noch einen Fotografen.");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.getByRole("status")).toHaveText("Danke! Ich melde mich bald.");
});

test("Kontakt: Verbindungsabbruch beim Senden zeigt einen Hinweis statt der Fehlerseite, Eingaben bleiben", async ({ page }) => {
  await page.goto("/kontakt");
  const token = page.locator('input[name="turnstile"]');
  await page.getByLabel("Name", { exact: true }).fill("Anna Keller");
  await page.getByLabel("E-Mail", { exact: true }).fill("anna@example.org");
  await page.getByText("Hochzeit", { exact: true }).click();
  await page.getByLabel("Nachricht", { exact: true }).fill("Wir heiraten im Juni in Hamburg und suchen noch einen Fotografen.");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  // Die Server-Aktion geht als POST an /kontakt; hier reißt die Verbindung ab (z. B. Funkloch).
  await page.route("**/kontakt", (route) => (route.request().method() === "POST" ? route.abort("connectionreset") : route.continue()));
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.getByText("Das hat leider nicht geklappt", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da ist etwas schiefgelaufen." })).toHaveCount(0);
  await expect(page.getByLabel("Nachricht", { exact: true })).toHaveValue(/Wir heiraten im Juni/);
  await expect(page.getByRole("radio", { name: "Hochzeit" })).toBeChecked();
});
