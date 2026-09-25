import { expect, test } from "@playwright/test";
import { ADMIN, loginAsAdmin } from "./helpers/admin";

// Weitere geschützte Seiten ergänzen Task 6 (Portfolio) und Task 7 (Texte).
const PROTECTED_PAGES = ["/admin", "/admin/portfolio/floorball"];

test("ohne Anmeldung führt jede Admin-Seite zum Login", async ({ page }) => {
  for (const path of PROTECTED_PAGES) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/admin\/login$/);
  }
});

test("gefälschtes Session-Cookie wird abgelehnt", async ({ page, context, baseURL }) => {
  const url = new URL(baseURL!);
  await context.addCookies([
    { name: "cosmo_admin", value: "eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.ZmFrZQ", domain: url.hostname, path: "/admin", secure: url.protocol === "https:", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("falsches Passwort zeigt einen Fehler", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort").fill("falsches-passwort-123");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Benutzername oder Passwort falsch.");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("Anmelden, Cookie-Eigenschaften, Abmelden", async ({ page, context }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Übersicht");

  const cookie = (await context.cookies()).find((c) => c.name === "cosmo_admin");
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/admin" });

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("zu viele Fehlversuche werden gebremst", async ({ page }) => {
  await page.goto("/admin/login");
  for (let i = 0; i < 7; i++) {
    await page.getByLabel("Benutzername").fill("angreifer");
    await page.getByLabel("Passwort").fill(`versuch-nummer-${i}`);
    await page.getByRole("button", { name: "Anmelden" }).click();
    // Während der Prüfung heißt der Button „Prüfe …“ – warten, bis die Antwort da ist.
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeEnabled();
  }
  await expect(page.locator("form").getByRole("alert")).toHaveText("Zu viele Versuche. Bitte eine Minute warten.");
});

test("Admin hat Clickjacking-Schutz, nosniff und noindex", async ({ request }) => {
  const res = await request.get("/admin/login");
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("same-origin");
  expect(h["x-robots-tag"]).toBe("noindex, nofollow");
});
