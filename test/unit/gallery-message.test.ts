import { describe, expect, it } from "vitest";
import { galleryMessage } from "@/lib/galleries/message";

const base = { url: "https://cosmo-photos.de/g/final4-2026", password: "rauch-hallen-47" };

describe("galleryMessage", () => {
  it("writes a German message with link, password and expiry", () => {
    const text = galleryMessage({ ...base, locale: "de", expiresAt: "2026-10-24T21:59:00.000Z" });
    expect(text).toContain("https://cosmo-photos.de/g/final4-2026");
    expect(text).toContain("Passwort: rauch-hallen-47");
    expect(text).toContain("bis 24.10.2026");
  });

  it("writes an English message and handles unlimited galleries", () => {
    const text = galleryMessage({ ...base, locale: "en", expiresAt: null });
    expect(text).toContain("Password: rauch-hallen-47");
    expect(text).toContain("stays online");
  });
});
