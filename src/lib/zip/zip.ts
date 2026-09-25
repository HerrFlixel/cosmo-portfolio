export type ZipEntry = { name: string; size: number; crc32: number; open: () => Promise<ReadableStream<Uint8Array>> };

/** Teile ≤ 2 GB: jeder Teil bleibt < 4 GiB, deshalb genügt das klassische ZIP-Format (kein Zip64). */
export const ZIP_PART_MAX_BYTES = 2_000_000_000;

const encoder = new TextEncoder();
const FLAG_UTF8 = 0x0800;
// Feste Zeitstempel (1.1.2026 00:00): gleiche Galerie → byte-gleiches ZIP.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function zipSize(entries: { name: string; size: number }[]): number {
  let total = 22;
  for (const entry of entries) {
    const nameLength = encoder.encode(entry.name).length;
    total += 30 + nameLength + entry.size + 46 + nameLength;
  }
  return total;
}

function localHeader(name: Uint8Array, entry: ZipEntry): Uint8Array {
  const out = new Uint8Array(30 + name.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 10, true); // benötigte Version 1.0
  v.setUint16(6, FLAG_UTF8, true);
  v.setUint16(8, 0, true); // STORE
  v.setUint16(10, DOS_TIME, true);
  v.setUint16(12, DOS_DATE, true);
  v.setUint32(14, entry.crc32, true);
  v.setUint32(18, entry.size, true);
  v.setUint32(22, entry.size, true);
  v.setUint16(26, name.length, true);
  out.set(name, 30);
  return out;
}

function centralHeader(name: Uint8Array, entry: ZipEntry, offset: number): Uint8Array {
  const out = new Uint8Array(46 + name.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 0x031e, true); // erstellt von Unix, Version 3.0
  v.setUint16(6, 10, true);
  v.setUint16(8, FLAG_UTF8, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, DOS_TIME, true);
  v.setUint16(14, DOS_DATE, true);
  v.setUint32(16, entry.crc32, true);
  v.setUint32(20, entry.size, true);
  v.setUint32(24, entry.size, true);
  v.setUint16(28, name.length, true);
  v.setUint32(38, (0o100644 << 16) >>> 0, true); // Dateirechte rw-r--r--
  v.setUint32(42, offset, true);
  out.set(name, 46);
  return out;
}

function endOfCentralDirectory(count: number, size: number, offset: number): Uint8Array {
  const out = new Uint8Array(22);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  return out;
}

async function* generate(entries: ZipEntry[]): AsyncGenerator<Uint8Array> {
  if (zipSize(entries) > 0xffffffff || entries.length > 0xffff) throw new Error("ZIP zu groß – bitte in Teile aufteilen.");
  let offset = 0;
  const central: Uint8Array[] = [];
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const header = localHeader(name, entry);
    yield header;
    const reader = (await entry.open()).getReader();
    let written = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      written += value.byteLength;
      yield value;
    }
    if (written !== entry.size) throw new Error(`Größe von ${entry.name} stimmt nicht (${written} statt ${entry.size} Bytes).`);
    central.push(centralHeader(name, entry, offset));
    offset += header.length + entry.size;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  for (const c of central) yield c;
  yield endOfCentralDirectory(entries.length, centralSize, offset);
}

/** Streamt ein unkomprimiertes ZIP; CRC und Größen kommen aus der Datenbank → kaum CPU, exakte Länge vorab. */
export function zipStream(entries: ZipEntry[]): ReadableStream<Uint8Array> {
  const iterator = generate(entries);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}

export function splitIntoParts<T extends { bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES): T[][] {
  const parts: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length > 0 && size + item.bytes > maxBytes) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.bytes;
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}

export type ZipPart<T> = { files: { item: T; name: string }[]; size: number };

/**
 * Aufteilung für „Alle/Favoriten herunterladen“: Namen über die ganze Auswahl eindeutig (Teile überschreiben sich
 * beim Entpacken nicht), exakte Größe je Teil. Worker und Galerie-Seite rufen dieselbe Funktion auf.
 */
export function zipPartsFor<T extends { filename: string; bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES): ZipPart<T>[] {
  const names = uniqueNames(items.map((item) => item.filename));
  const named = items.map((item, index) => ({ item, name: names[index], bytes: item.bytes }));
  return splitIntoParts(named, maxBytes).map((part) => ({
    files: part.map(({ item, name }) => ({ item, name })),
    size: zipSize(part.map(({ name, bytes }) => ({ name, size: bytes }))),
  }));
}
