const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const CRC32_START = 0xffffffff;

/** Laufende CRC32 (für Streams): mit CRC32_START beginnen, am Ende crc32Finish. */
export function crc32Update(crc: number, bytes: Uint8Array): number {
  let c = crc;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}

export const crc32Finish = (crc: number) => (crc ^ 0xffffffff) >>> 0;

export const crc32 = (bytes: Uint8Array) => crc32Finish(crc32Update(CRC32_START, bytes));
