import { describe, expect, it } from "vitest";
import { readAdminConfig } from "@/lib/auth/admin-config";

const OK = {
  ADMIN_USERNAME: "felix",
  ADMIN_PASSWORD_HASH: "pbkdf2-sha256$100000$a$b",
  SESSION_SECRET: "x".repeat(32),
};

describe("readAdminConfig", () => {
  it("returns the admin settings", () => {
    expect(readAdminConfig(OK)).toEqual({ username: "felix", passwordHash: OK.ADMIN_PASSWORD_HASH, sessionSecret: OK.SESSION_SECRET });
  });

  it("names every missing value and how to set it", () => {
    expect(() => readAdminConfig({ ADMIN_USERNAME: "felix" })).toThrow(
      'Admin-Konfiguration fehlt: ADMIN_PASSWORD_HASH, SESSION_SECRET – als Variable in wrangler.jsonc bzw. per "wrangler secret put" setzen.',
    );
  });

  it("rejects a session secret shorter than 32 characters", () => {
    expect(() => readAdminConfig({ ...OK, SESSION_SECRET: "zu-kurz" })).toThrow("SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  });
});
