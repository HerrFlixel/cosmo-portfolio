import { expect, type Page } from "@playwright/test";

/** Lokal aus .dev.vars; gegen Deployments per Umgebungsvariable (Task 8). */
export const ADMIN = {
  username: process.env.E2E_ADMIN_USER ?? "felix",
  password: process.env.E2E_ADMIN_PASSWORD ?? "lokal-test-passwort",
};

/** Gespeicherte Admin-Sitzung (erzeugt von auth.setup.ts, nicht im Git). */
export const ADMIN_STATE = "test/e2e/.auth/admin.json";

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** 1×1-WebP (gültige Magic Bytes) für API-Tests. */
export const TINY_WEBP = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");

/** Löscht alle Bilder einer Kategorie über die API (Tests sind so unabhängig voneinander). */
export async function clearCategory(page: Page, category: string) {
  const res = await page.request.get(`/admin/api/portfolio?category=${category}`);
  expect(res.status()).toBe(200);
  for (const image of (await res.json()) as { id: string }[]) {
    expect((await page.request.delete(`/admin/api/portfolio/${image.id}`)).status()).toBe(204);
  }
}

/** Legt ein Bild direkt über die API an (simuliert einen parallel laufenden Upload, den die Seite noch nicht kennt). */
export async function createImageViaApi(page: Page, category: string): Promise<string> {
  const id = crypto.randomUUID();
  for (const size of [800, 1600, 2400]) {
    const put = await page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
    expect(put.status()).toBe(204);
  }
  const created = await page.request.post("/admin/api/portfolio", { data: { id, category, width: 10, height: 10, color: "#000000" } });
  expect(created.status()).toBe(201);
  return id;
}
