import { describe, expect, it } from "vitest";
import { LOCKUP, WORDMARK } from "@/components/site/logo-paths";
import { INTRO_SEEN_KEY, bootMotion, type BootWindow } from "@/lib/motion/boot";
import { coverTransform, introStart, parallaxDistance, ringOffset } from "@/lib/motion/geometry";
import { LOGO_PIECES, LOGO_RING_INDEX } from "@/lib/motion/logo-pieces";

function fakeWindow({ reduce = false, path = "/", seen = false, storageThrows = false } = {}) {
  const classes = new Set<string>();
  const dataset: Record<string, string | undefined> = {};
  const timers: (() => void)[] = [];
  const win: BootWindow = {
    document: { documentElement: { classList: { add: (name: string) => void classes.add(name) }, dataset } },
    matchMedia: () => ({ matches: reduce }),
    location: { pathname: path },
    sessionStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("blocked");
        return seen && key === INTRO_SEEN_KEY ? "seen" : null;
      },
    },
    setTimeout: (callback: () => void) => {
      timers.push(callback);
      return 0;
    },
  };
  return { win, classes, dataset, timers };
}

describe("bootMotion", () => {
  it("switches motion on and marks the intro on the first visit to the home page (with a safety net)", () => {
    const { win, classes, dataset, timers } = fakeWindow();
    bootMotion(win);
    expect([...classes]).toEqual(["has-motion"]);
    expect(dataset.intro).toBe("pending");
    timers[0]();
    expect(dataset.intro).toBeUndefined();
    const english = fakeWindow({ path: "/en" });
    bootMotion(english.win);
    expect(english.dataset.intro).toBe("pending");
  });

  it("does not mark the intro when it was seen or on other pages", () => {
    for (const setup of [{ seen: true }, { path: "/floorball" }, { path: "/en/about" }]) {
      const { win, classes, dataset } = fakeWindow(setup);
      bootMotion(win);
      expect(classes.has("has-motion")).toBe(true);
      expect(dataset.intro).toBeUndefined();
    }
  });

  it("does nothing with reduced motion and survives blocked storage", () => {
    const reduced = fakeWindow({ reduce: true });
    bootMotion(reduced.win);
    expect(reduced.classes.size).toBe(0);
    expect(reduced.dataset.intro).toBeUndefined();
    const blocked = fakeWindow({ storageThrows: true });
    expect(() => bootMotion(blocked.win)).not.toThrow();
    expect(blocked.classes.has("has-motion")).toBe(true);
    expect(blocked.dataset.intro).toBeUndefined();
  });
});

describe("geometry", () => {
  it("coverTransform scales a box to cover the viewport around its centre", () => {
    expect(coverTransform({ left: 100, top: 200, width: 400, height: 300 }, { width: 1200, height: 800 })).toEqual({ x: 300, y: 50, scale: 3 });
  });

  it("introStart places the header logo at half the width (max 760 px), centred at 36 % height", () => {
    const desktop = introStart({ left: 32, top: 18, width: 150, height: 37 }, { width: 1440, height: 900 });
    expect(desktop.scale).toBeCloseTo(4.8);
    expect(desktop.x).toBeCloseTo(328);
    expect(desktop.y).toBeCloseTo(217.2);
    const phone = introStart({ left: 16, top: 20, width: 104, height: 26 }, { width: 390, height: 844 });
    expect(phone.scale * 104).toBeCloseTo(195);
    expect(phone.x + 16 + phone.scale * 104).toBeLessThanOrEqual(390);
  });

  it("ringOffset closes the progress ring and clamps the progress", () => {
    expect(ringOffset(0, 100)).toBe(100);
    expect(ringOffset(0.25, 100)).toBe(75);
    expect(ringOffset(1.2, 100)).toBe(0);
    expect(ringOffset(-1, 100)).toBe(100);
  });

  it("parallaxDistance halves the distance on phones", () => {
    expect(parallaxDistance(0.2, 900, false)).toBe(180);
    expect(parallaxDistance(0.2, 900, true)).toBe(90);
  });
});

describe("logo pieces", () => {
  it("map every letter path of the wordmark to an upper or lower piece; the lockup adds PHOTOS", () => {
    expect(LOGO_PIECES).toHaveLength(WORDMARK.paths.length - 1);
    expect(LOGO_RING_INDEX).toBe(WORDMARK.paths.length - 1);
    expect(LOCKUP.paths.slice(0, WORDMARK.paths.length)).toEqual([...WORDMARK.paths]);
    expect(LOCKUP.paths.length - WORDMARK.paths.length).toBe(6);
    for (const letter of [0, 1, 2, 3, 4]) {
      expect(LOGO_PIECES.some(([kind, l]) => kind === "u" && l === letter)).toBe(true);
      expect(LOGO_PIECES.some(([kind, l]) => kind === "d" && l === letter)).toBe(true);
    }
  });
});
