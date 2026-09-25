import { describe, expect, it } from "vitest";
import { resolveGalleryLocale } from "@/lib/galleries/locale";

describe("resolveGalleryLocale", () => {
  it("prefers the explicit cookie", () => {
    expect(resolveGalleryLocale("en", "de-DE,de;q=0.9")).toBe("en");
    expect(resolveGalleryLocale("de", "en-US")).toBe("de");
  });

  it("falls back to Accept-Language: German → de, everything else → en", () => {
    expect(resolveGalleryLocale(undefined, "de-AT,de;q=0.9")).toBe("de");
    expect(resolveGalleryLocale(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(resolveGalleryLocale(undefined, "fr-FR")).toBe("en");
    expect(resolveGalleryLocale("xx", null)).toBe("de");
  });
});
