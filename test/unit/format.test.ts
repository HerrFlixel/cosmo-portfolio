import { describe, expect, it } from "vitest";
import { endOfBerlinDay, formatBytes, formatDate, formatDateInput } from "@/lib/format";
import { readCookie } from "@/lib/cookies";

describe("formatBytes", () => {
  it("uses decimal units and the locale's decimal separator", () => {
    expect(formatBytes(3_200_000_000, "de")).toBe("3,2 GB");
    expect(formatBytes(3_200_000_000, "en")).toBe("3.2 GB");
    expect(formatBytes(950_000, "de")).toBe("950 KB");
    expect(formatBytes(0, "de")).toBe("0 B");
  });
});

describe("formatDate", () => {
  it("formats in German and British English (Berlin time)", () => {
    expect(formatDate("2026-10-24T21:59:00.000Z", "de")).toBe("24.10.2026");
    expect(formatDate("2026-10-24T21:59:00.000Z", "en")).toBe("24 Oct 2026");
  });
});

describe("formatDateInput / endOfBerlinDay", () => {
  it("round-trips a chosen day in summer and winter without shifting it", () => {
    for (const day of ["2026-07-01", "2026-10-24", "2026-12-31"]) {
      expect(endOfBerlinDay(day)).toBe(`${day}T21:59:59.000Z`);
      expect(formatDateInput(endOfBerlinDay(day))).toBe(day);
      expect(formatDate(endOfBerlinDay(day), "de")).toBe(day.split("-").reverse().join("."));
    }
  });

  it("uses the Berlin calendar day for date inputs", () => {
    expect(formatDateInput("2026-01-10T23:30:00.000Z")).toBe("2026-01-11");
  });
});

describe("readCookie", () => {
  it("reads and decodes a cookie from a header", () => {
    expect(readCookie("a=1; cosmo_besucher=Anna%20M%C3%BCller; b=2", "cosmo_besucher")).toBe("Anna Müller");
    expect(readCookie("a=1", "cosmo_besucher")).toBeUndefined();
    expect(readCookie("cosmo_besucher=%E0%A4%A", "cosmo_besucher")).toBeUndefined();
    expect(readCookie(null, "x")).toBeUndefined();
  });
});
