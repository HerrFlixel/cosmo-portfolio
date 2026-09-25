export const IMAGE_SIZES = [800, 1600, 2400] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Öffentlich auslieferbare Bereiche. Kundengalerien (galleries/…) sind bewusst NICHT dabei. */
export const MEDIA_KINDS = ["portfolio", "site"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isUuid = (value: string) => UUID.test(value);
export const isImageSize = (value: number): value is ImageSize => (IMAGE_SIZES as readonly number[]).includes(value);
export const isMediaKind = (value: string): value is MediaKind => (MEDIA_KINDS as readonly string[]).includes(value);

export function mediaKey(kind: MediaKind, id: string, size: ImageSize): string {
  return `${kind}/${id}/${size}`;
}

export function mediaUrl(kind: MediaKind, id: string, size: ImageSize): string {
  return `/media/${mediaKey(kind, id, size)}`;
}

/** URL-Segmente → R2-Schlüssel; null bei allem Unerwarteten (fremde Präfixe, Pfad-Tricks, falsche Größen). */
export function parseMediaKey(segments: readonly string[]): string | null {
  if (segments.length !== 3) return null;
  const [kind, id, size] = segments;
  const width = Number(size);
  if (!isMediaKind(kind) || !isUuid(id) || String(width) !== size || !isImageSize(width)) return null;
  return mediaKey(kind, id, width);
}
