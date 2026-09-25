import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "@/lib/galleries/slug";

describe("slugify", () => {
  it("makes readable lowercase slugs with German transliteration", () => {
    expect(slugify("Final4 Zwickau 2026")).toBe("final4-zwickau-2026");
    expect(slugify("Hochzeit Müller & Groß")).toBe("hochzeit-mueller-gross");
    expect(slugify("Café Olé!")).toBe("cafe-ole");
  });

  it("falls back to 'galerie' and never ends with a dash", () => {
    expect(slugify("  *** ")).toBe("galerie");
    const long = slugify("a".repeat(59) + " b c d e f");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
  });

  it("produces slugs that match SLUG_PATTERN", () => {
    for (const title of ["Derby ETV vs. SVE", "ÄÖÜ äöü ß", "x"]) expect(slugify(title)).toMatch(SLUG_PATTERN);
    expect("Grosse-Galerie").not.toMatch(SLUG_PATTERN);
    expect("a--b").not.toMatch(SLUG_PATTERN);
  });
});
