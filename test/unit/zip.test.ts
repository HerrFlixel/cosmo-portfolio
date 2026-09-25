import { describe, expect, it } from "vitest";
import { crc32 } from "@/lib/zip/crc32";
import { ZIP_PART_MAX_BYTES, splitIntoParts, uniqueNames, zipPartsFor, zipSize, zipStream, type ZipEntry } from "@/lib/zip/zip";

const bytesOf = (s: string) => new TextEncoder().encode(s);
const streamOf = (data: Uint8Array, chunk = 3) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < data.length; i += chunk) controller.enqueue(data.subarray(i, i + chunk));
      controller.close();
    },
  });

function entry(name: string, content: string): ZipEntry {
  const data = bytesOf(content);
  return { name, size: data.length, crc32: crc32(data), open: async () => streamOf(data) };
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Minimaler ZIP-Leser: Endeintrag → zentrales Verzeichnis → lokale Einträge. */
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(p, true)).toBe(0x02014b50);
    const flags = view.getUint16(p + 8, true);
    const crc = view.getUint32(p + 16, true);
    const size = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLength));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    files.push({ name, flags, crc, size, data: zip.subarray(dataStart, dataStart + size) });
    p += 46 + nameLength;
  }
  return files;
}

describe("zipStream", () => {
  it("writes a valid STORE zip whose length matches zipSize exactly", async () => {
    const entries = [entry("IMG_0001.jpg", "hallo"), entry("Hochzeit Müller ß.jpg", "welt!")];
    const zip = await collect(zipStream(entries));
    expect(zip.length).toBe(zipSize(entries));
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual(["IMG_0001.jpg", "Hochzeit Müller ß.jpg"]);
    for (const [i, f] of files.entries()) {
      expect(f.flags & 0x0800).toBe(0x0800);
      expect(f.size).toBe(entries[i].size);
      expect(f.crc).toBe(crc32(f.data));
    }
    expect(new TextDecoder().decode(files[1].data)).toBe("welt!");
  });

  it("writes an empty but valid zip", async () => {
    const zip = await collect(zipStream([]));
    expect(zip.length).toBe(22);
    expect(readZip(zip)).toEqual([]);
  });

  it("fails loudly when a file is shorter than announced", async () => {
    const broken: ZipEntry = { ...entry("a.jpg", "abc"), size: 10 };
    await expect(collect(zipStream([broken]))).rejects.toThrow("Größe von a.jpg stimmt nicht (3 statt 10 Bytes).");
  });
});

describe("splitIntoParts", () => {
  it("keeps order and never exceeds the limit (single oversized items get their own part)", () => {
    const items = [{ bytes: 6 }, { bytes: 5 }, { bytes: 4 }, { bytes: 12 }, { bytes: 1 }];
    expect(splitIntoParts(items, 10).map((part) => part.map((i) => i.bytes))).toEqual([[6], [5, 4], [12], [1]]);
    expect(splitIntoParts([], 10)).toEqual([]);
  });

  it("uses 2 GB parts by default", () => {
    expect(ZIP_PART_MAX_BYTES).toBe(2_000_000_000);
    expect(splitIntoParts([{ bytes: 1_500_000_000 }, { bytes: 600_000_000 }])).toHaveLength(2);
  });
});

describe("uniqueNames", () => {
  it("numbers duplicates before the extension", () => {
    expect(uniqueNames(["a.jpg", "a.jpg", "b.jpg", "a.jpg", "noext", "noext"])).toEqual([
      "a.jpg",
      "a (2).jpg",
      "b.jpg",
      "a (3).jpg",
      "noext",
      "noext (2)",
    ]);
  });
});

describe("zipPartsFor", () => {
  it("keeps names unique across parts and reports each part's exact size", () => {
    const images = [
      { filename: "a.jpg", bytes: 6 },
      { filename: "a.jpg", bytes: 5 },
      { filename: "b.jpg", bytes: 4 },
    ];
    const parts = zipPartsFor(images, 10);
    expect(parts.map((part) => part.files.map((file) => file.name))).toEqual([["a.jpg"], ["a (2).jpg", "b.jpg"]]);
    expect(parts[1].files[0].item).toBe(images[1]);
    expect(parts[1].size).toBe(zipSize([{ name: "a (2).jpg", size: 5 }, { name: "b.jpg", size: 4 }]));
    expect(zipPartsFor([])).toEqual([]);
  });
});
