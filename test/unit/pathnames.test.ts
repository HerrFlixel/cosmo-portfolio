import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { LOCALES, PATHNAMES, externalPath } from "@/i18n/pathnames";

describe("pathnames", () => {
  it("has an entry for every category", () => {
    for (const c of CATEGORIES) expect(Object.keys(PATHNAMES)).toContain(`/${c}`);
  });

  it("maps localized paths from the spec", () => {
    expect(externalPath("/fussball", "de")).toBe("/fussball");
    expect(externalPath("/fussball", "en")).toBe("/football");
    expect(externalPath("/hochzeiten", "en")).toBe("/weddings");
    expect(externalPath("/ueber-mich", "en")).toBe("/about");
    expect(externalPath("/kunden", "en")).toBe("/clients");
    expect(externalPath("/impressum", "en")).toBe("/imprint");
    expect(externalPath("/datenschutz", "en")).toBe("/privacy");
  });

  it("uses unique, lowercase ASCII paths per locale", () => {
    for (const locale of LOCALES) {
      const paths = Object.keys(PATHNAMES).map((k) => externalPath(k as keyof typeof PATHNAMES, locale));
      expect(new Set(paths).size).toBe(paths.length);
      for (const p of paths) expect(p).toMatch(/^\/[a-z-]*$/);
    }
  });
});
