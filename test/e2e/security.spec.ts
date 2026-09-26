import { expect, test, type Page } from "@playwright/test";

const collectViolations = () => {
  const store = window as unknown as { cspViolations: string[] };
  store.cspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) =>
    store.cspViolations.push(`${event.violatedDirective} ${event.blockedURI} (${event.sourceFile || "inline"}:${event.lineNumber})`),
  );
};
const violations = (page: Page) => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);

test("CSP: öffentliche Seiten senden eine CSP mit Nonce, das Boot-Skript trägt sie; Admin behält seine", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response!.headers()["content-security-policy"];
  const nonce = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  // Das nonce-Attribut ist im DOM verborgen, die Property bleibt lesbar.
  expect(await page.locator("body > script").first().evaluate((script) => (script as HTMLScriptElement).nonce)).toBe(nonce);
  expect((await page.request.get("/")).headers()["content-security-policy"]).not.toBe(csp);
  expect((await page.request.get("/admin/login")).headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
});

for (const motion of ["reduce", "no-preference"] as const) {
  test(`CSP: keine Verstöße auf Start, Kategorie, Über mich und Kontakt (${motion === "reduce" ? "ohne" : "mit"} Bewegung)`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: "de-DE", reducedMotion: motion });
    await context.addInitScript(collectViolations);
    const page = await context.newPage();

    await page.goto("/"); // mit Bewegung inklusive Intro
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(motion === "no-preference" ? 3500 : 300);
    expect(await violations(page), "/").toEqual([]);

    await page.goto("/floorball");
    const photo = page.getByRole("button", { name: "Floorball, Foto 1" });
    if ((await photo.count()) > 0) {
      await photo.click();
      await expect(page.getByTestId("lightbox")).toBeVisible();
    }
    expect(await violations(page), "/floorball").toEqual([]);

    await page.goto("/ueber-mich");
    expect(await violations(page), "/ueber-mich").toEqual([]);

    await page.goto("/kontakt");
    const token = page.locator('input[name="turnstile"]');
    if ((await token.count()) > 0) await expect(token).not.toHaveValue("", { timeout: 20_000 });
    expect(await violations(page), "/kontakt").toEqual([]);
    await context.close();
  });
}
