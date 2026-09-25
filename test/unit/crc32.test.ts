import { describe, expect, it } from "vitest";
import { CRC32_START, crc32, crc32Finish, crc32Update } from "@/lib/zip/crc32";

const ascii = (s: string) => new TextEncoder().encode(s);

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(ascii("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("gives the same result when fed in chunks", () => {
    let crc = CRC32_START;
    crc = crc32Update(crc, ascii("1234"));
    crc = crc32Update(crc, ascii("56789"));
    expect(crc32Finish(crc)).toBe(0xcbf43926);
  });
});
