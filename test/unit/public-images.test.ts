import { describe, expect, it } from "vitest";
import { altText, imageSources } from "@/lib/public/images";

describe("imageSources", () => {
  it("lists the generated widths of a landscape photo", () => {
    expect(imageSources("portfolio", { id: "x", width: 6000, height: 4000 })).toEqual({
      src: "/media/portfolio/x/1600",
      srcSet: "/media/portfolio/x/800 800w, /media/portfolio/x/1600 1600w, /media/portfolio/x/2400 2400w",
    });
  });

  it("uses the real widths of a portrait photo", () => {
    expect(imageSources("portfolio", { id: "x", width: 4000, height: 6000 }).srcSet).toBe(
      "/media/portfolio/x/800 533w, /media/portfolio/x/1600 1067w, /media/portfolio/x/2400 1600w",
    );
  });

  it("drops variants that were not enlarged (same width twice)", () => {
    expect(imageSources("portfolio", { id: "x", width: 900, height: 600 }).srcSet).toBe(
      "/media/portfolio/x/800 800w, /media/portfolio/x/1600 900w",
    );
  });
});

describe("altText", () => {
  it("prefers the text of the page language and falls back otherwise", () => {
    const image = { altDe: "Jubel nach dem Siegtor", altEn: "  " };
    expect(altText(image, "de", "Floorball, Foto 1")).toBe("Jubel nach dem Siegtor");
    expect(altText(image, "en", "Floorball, photo 1")).toBe("Floorball, photo 1");
    expect(altText({ altDe: null, altEn: null }, "de", "Studio, Foto 2")).toBe("Studio, Foto 2");
  });
});
