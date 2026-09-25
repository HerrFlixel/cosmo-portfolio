import { test as setup } from "@playwright/test";
import { ADMIN_STATE, loginAsAdmin } from "./helpers/admin";

// Einmal anmelden und die Sitzung speichern: Admin-Tests nutzen sie, statt sich ständig neu anzumelden
// (das Login-Rate-Limit von 5 Versuchen pro Minute würde sonst greifen).
setup("Admin-Sitzung anlegen", async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: ADMIN_STATE });
});
