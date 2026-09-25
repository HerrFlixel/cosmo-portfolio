import { describe, expect, it } from "vitest";
import { averageColor, targetSize } from "@/lib/image/sizing";

describe("targetSize", () => {
  it("limits the longest edge", () => {
    expect(targetSize(6000, 4000, 2400)).toEqual({ width: 2400, height: 1600 });
    expect(targetSize(4000, 6000, 800)).toEqual({ width: 533, height: 800 });
  });

  it("never upscales small images", () => {
    expect(targetSize(600, 300, 800)).toEqual({ width: 600, height: 300 });
    expect(targetSize(1, 1, 2400)).toEqual({ width: 1, height: 1 });
  });

  it("never returns zero pixels for extreme panoramas", () => {
    expect(targetSize(20000, 10, 800)).toEqual({ width: 800, height: 1 });
  });
});

describe("averageColor", () => {
  it("averages RGB and ignores alpha", () => {
    expect(averageColor([255, 0, 0, 255, 0, 0, 255, 0])).toBe("#800080");
  });

  it("returns black for empty input", () => {
    expect(averageColor([])).toBe("#000000");
  });
});
