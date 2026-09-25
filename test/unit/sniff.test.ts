import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/media/sniff";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("sniffImageType", () => {
  it("recognises WebP and JPEG by their magic bytes", () => {
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("rejects everything else", () => {
    expect(sniffImageType(bytes("<html>hello</html>"))).toBeNull();
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a))).toBeNull();
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WAVEfmt "))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
