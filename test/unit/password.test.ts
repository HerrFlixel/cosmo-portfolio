import { describe, expect, it } from "vitest";
import devVars from "../../.dev.vars.example?raw";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing (PBKDF2)", () => {
  it("produces the documented format with a fresh salt each time", async () => {
    const a = await hashPassword("ein-langes-passwort");
    const b = await hashPassword("ein-langes-passwort");
    expect(a).toMatch(/^pbkdf2-sha256\$100000\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("verifies the right password and rejects wrong ones", async () => {
    const stored = await hashPassword("richtig-und-lang");
    expect(await verifyPassword("richtig-und-lang", stored)).toBe(true);
    expect(await verifyPassword("falsch-und-lang", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("rejects malformed or tampered hashes instead of throwing", async () => {
    const stored = await hashPassword("richtig-und-lang");
    const [, , salt, hash] = stored.split("$");
    for (const bad of [
      "",
      "kaputt",
      `pbkdf2-sha1$100000$${salt}$${hash}`,
      `pbkdf2-sha256$abc$${salt}$${hash}`,
      `pbkdf2-sha256$1000000$${salt}$${hash}`,
      `pbkdf2-sha256$100000$!!!$${hash}`,
      `pbkdf2-sha256$100000$${salt}$${hash}x`,
    ]) {
      expect(await verifyPassword("richtig-und-lang", bad), bad).toBe(false);
    }
  });

  it("verifies the local test hash that scripts/hash-password.mts wrote into .dev.vars.example", async () => {
    const line = devVars.split("\n").find((l) => l.startsWith("ADMIN_PASSWORD_HASH="));
    expect(line).toBeDefined();
    expect(await verifyPassword("lokal-test-passwort", line!.slice("ADMIN_PASSWORD_HASH=".length).trim())).toBe(true);
  });
});
