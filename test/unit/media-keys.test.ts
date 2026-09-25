import { describe, expect, it } from "vitest";
import { IMAGE_SIZES, isUuid, mediaKey, mediaUrl, parseMediaKey } from "@/lib/media/keys";

const ID = "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d";

describe("media keys", () => {
  it("defines the three image sizes", () => {
    expect(IMAGE_SIZES).toEqual([800, 1600, 2400]);
  });

  it("builds keys and public URLs without file extension", () => {
    expect(mediaKey("portfolio", ID, 1600)).toBe(`portfolio/${ID}/1600`);
    expect(mediaUrl("site", ID, 800)).toBe(`/media/site/${ID}/800`);
  });

  it("accepts only lowercase v1–v8 UUIDs", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(ID.toUpperCase())).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(`${ID}/../x`)).toBe(false);
  });

  it("maps valid public URL segments to R2 keys", () => {
    expect(parseMediaKey(["portfolio", ID, "800"])).toBe(`portfolio/${ID}/800`);
    expect(parseMediaKey(["site", ID, "2400"])).toBe(`site/${ID}/2400`);
  });

  it("never exposes private or unexpected keys", () => {
    for (const segments of [
      ["galleries", ID, "800"],
      ["portfolio", ID, "900"],
      ["portfolio", ID, "0800"],
      ["portfolio", ID, "800.webp"],
      ["portfolio", "..", "800"],
      ["portfolio", ID],
      ["portfolio", ID, "800", "extra"],
      [],
    ]) {
      expect(parseMediaKey(segments), segments.join("/")).toBeNull();
    }
  });
});
