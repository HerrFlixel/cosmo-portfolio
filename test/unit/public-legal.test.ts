import { describe, expect, it } from "vitest";
import { legalText } from "@/lib/public/legal";
import { SETTINGS_DEFAULTS } from "@/lib/settings/schema";

describe("legalText", () => {
  it("shows the German imprint on the English page until an English one exists", () => {
    const settings = { ...SETTINGS_DEFAULTS, imprint_de: "Felix Vatterodt\nHamburg" };
    expect(legalText(settings, "imprint", "de")).toEqual({ text: "Felix Vatterodt\nHamburg", fallback: false });
    expect(legalText(settings, "imprint", "en")).toEqual({ text: "Felix Vatterodt\nHamburg", fallback: true });
    expect(legalText({ ...settings, imprint_en: "Felix Vatterodt, Hamburg" }, "imprint", "en")).toEqual({ text: "Felix Vatterodt, Hamburg", fallback: false });
    expect(legalText(SETTINGS_DEFAULTS, "privacy", "en")).toEqual({ text: "", fallback: false });
  });
});
