import { expect, type Page } from "@playwright/test";

/** Lokal aus .dev.vars; gegen Deployments per Umgebungsvariable (Task 8). */
export const ADMIN = {
  username: process.env.E2E_ADMIN_USER ?? "felix",
  password: process.env.E2E_ADMIN_PASSWORD ?? "lokal-test-passwort",
};

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
