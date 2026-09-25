const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Erkennt den Bildtyp an den ersten Bytes; der Content-Type-Header allein ist nicht vertrauenswürdig. */
export function sniffImageType(bytes: Uint8Array): "image/webp" | "image/jpeg" | null {
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
