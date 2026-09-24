import { describe, expect, it } from "vitest";
import { CATEGORIES, isCategory } from "@/lib/categories";

describe("categories", () => {
  it("contains exactly the five categories in display order", () => {
    expect(CATEGORIES).toEqual(["floorball", "volleyball", "fussball", "hochzeiten", "studio"]);
  });

  it("accepts known slugs only (case-sensitive, no umlauts)", () => {
    expect(isCategory("fussball")).toBe(true);
    expect(isCategory("fußball")).toBe(false);
    expect(isCategory("Floorball")).toBe(false);
    expect(isCategory("")).toBe(false);
    expect(isCategory("football")).toBe(false);
  });
});
