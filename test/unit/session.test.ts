import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-secret-mit-mindestens-32-zeichen!!";
const NOW = 1_800_000_000;

describe("admin session tokens", () => {
  it("lasts 7 days", () => {
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it("verifies a fresh token until it expires", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(true);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS - 1)).toBe(true);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS)).toBe(false);
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await createSessionToken("anderes-secret-mit-mindestens-32-zeichen", NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects a token whose payload was changed (e.g. extended expiry)", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const [, sig] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ sub: "admin", exp: NOW + 10 ** 9 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifySessionToken(`${forgedBody}.${sig}`, SECRET, NOW)).toBe(false);
  });

  it("rejects garbage without throwing", async () => {
    for (const bad of [undefined, "", "abc", "a.b.c", "!!!.???", "e30.e30"]) {
      expect(await verifySessionToken(bad, SECRET, NOW), String(bad)).toBe(false);
    }
  });
});
