import { expect, test } from "@playwright/test";

const skipIntro = () => sessionStorage.setItem("cosmo-intro", "seen");

test.describe("mit Bewegung", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Bewegung: Lenis und has-motion sind aktiv, auch nach einem Seitenwechsel", async ({ page }) => {
    await page.addInitScript(skipIntro);
    await page.goto("/ueber-mich");
    const html = page.locator("html");
    await expect(html).toHaveClass(/has-motion/);
    await expect(html).toHaveClass(/lenis/);
    await page.getByRole("banner").getByRole("link", { name: "Kontakt" }).click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect(html).toHaveClass(/lenis/);
    expect(await page.evaluate(() => document.querySelectorAll("html.lenis").length)).toBe(1);
  });
});

test("Bewegung: mit „weniger Bewegung“ weder has-motion noch Lenis", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("html")).not.toHaveClass(/has-motion|lenis/);
});
