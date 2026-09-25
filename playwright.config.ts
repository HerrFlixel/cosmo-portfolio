import { defineConfig, devices } from "@playwright/test";

// Standard: lokale workerd-Vorschau. Mit PLAYWRIGHT_BASE_URL gegen ein Deployment testen.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  testDir: "./test/e2e",
  testIgnore: ["**/._*"],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, locale: "de-DE" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], locale: "de-DE" }, dependencies: ["setup"] },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run preview:e2e",
        url: "http://localhost:8787",
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
