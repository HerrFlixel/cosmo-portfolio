import { describe, expect, it } from "vitest";
import { emphasis, linkParts, textBlocks } from "@/lib/public/text";

describe("textBlocks", () => {
  it("splits paragraphs at blank lines and keeps line breaks", () => {
    expect(textBlocks("Felix Vatterodt\nMusterweg 1\n\nE-Mail: hallo@cosmo-photos.de")).toEqual([
      { kind: "paragraph", lines: ["Felix Vatterodt", "Musterweg 1"] },
      { kind: "paragraph", lines: ["E-Mail: hallo@cosmo-photos.de"] },
    ]);
  });

  it("turns single lines starting with # into headings and ignores empty input", () => {
    expect(textBlocks("## Haftung\r\n\r\nText")).toEqual([
      { kind: "heading", lines: ["Haftung"] },
      { kind: "paragraph", lines: ["Text"] },
    ]);
    expect(textBlocks("  \n\n ")).toEqual([]);
  });
});

describe("emphasis", () => {
  it("marks *text* as italic and leaves single asterisks alone", () => {
    expect(emphasis("Hallen, Rauch, *Gänsehaut.*")).toEqual([
      { text: "Hallen, Rauch, ", italic: false },
      { text: "Gänsehaut.", italic: true },
    ]);
    expect(emphasis("ohne")).toEqual([{ text: "ohne", italic: false }]);
    expect(emphasis("a * b")).toEqual([{ text: "a * b", italic: false }]);
  });
});

describe("linkParts", () => {
  it("links web addresses and e-mails without trailing punctuation", () => {
    expect(linkParts("Mail: hallo@cosmo-photos.de, Web: https://cosmo-photos.de.")).toEqual([
      { text: "Mail: " },
      { text: "hallo@cosmo-photos.de", href: "mailto:hallo@cosmo-photos.de" },
      { text: ", Web: " },
      { text: "https://cosmo-photos.de", href: "https://cosmo-photos.de" },
      { text: "." },
    ]);
  });
});
