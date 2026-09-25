import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "drizzle"));

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-08-15",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          r2Buckets: ["MEDIA", "GALLERIES"],
          // Test-only: Migrationen im Setup anwenden
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    resolve: {
      alias: { "@": path.join(import.meta.dirname, "src") },
    },
    test: {
      include: ["test/unit/**/*.test.ts"],
      exclude: ["**/node_modules/**", "**/._*"],
      setupFiles: ["./test/setup/apply-migrations.ts"],
    },
  };
});
