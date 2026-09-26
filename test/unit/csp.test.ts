import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "@/lib/csp";

describe("contentSecurityPolicy", () => {
  it("Skripte nur mit Nonce und strict-dynamic, Turnstile als einzige Fremdquelle, kein Einbetten", () => {
    const policy = contentSecurityPolicy("abc");
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' https://challenges.cloudflare.com");
    expect(policy).toContain("frame-src https://challenges.cloudflare.com");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("Entwicklung (next dev): unsafe-eval für React Refresh", () => {
    expect(contentSecurityPolicy("abc", true)).toContain("'unsafe-eval'");
  });
});

describe("createNonce", () => {
  it("128 Bit zufällig, Base64", () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(nonce);
  });
});
