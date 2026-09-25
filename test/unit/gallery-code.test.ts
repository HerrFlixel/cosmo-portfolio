import { describe, expect, it } from "vitest";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

describe("galleryCodeToSlug", () => {
  it("accepts codes, typed titles and pasted links", () => {
    expect(galleryCodeToSlug("final4-2026")).toBe("final4-2026");
    expect(galleryCodeToSlug("  Final4 2026 ")).toBe("final4-2026");
    expect(galleryCodeToSlug("https://cosmo-photos.de/g/final4-2026?x=1")).toBe("final4-2026");
    expect(galleryCodeToSlug("cosmo-photos.de/g/hochzeit-mueller/")).toBe("hochzeit-mueller");
    expect(galleryCodeToSlug("Hochzeit Müller")).toBe("hochzeit-mueller");
  });

  it("rejects empty or meaningless input", () => {
    for (const input of ["", "   ", "***", "/g/", "https://cosmo-photos.de/g/"]) expect(galleryCodeToSlug(input)).toBeNull();
  });
});
