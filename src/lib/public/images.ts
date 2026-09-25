import { targetSize } from "@/lib/image/sizing";
import { IMAGE_SIZES, mediaUrl, type MediaKind } from "@/lib/media/keys";

export type SizedImage = { id: string; width: number; height: number };

/**
 * srcset aus den drei gespeicherten Größen. Die Breiten sind die tatsächlich erzeugten (kleine Originale werden
 * nicht vergrößert), doppelte Breiten entfallen. `src` ist die 1600er-Größe, die es immer gibt.
 */
export function imageSources(kind: MediaKind, image: SizedImage): { src: string; srcSet: string } {
  const entries: string[] = [];
  let lastWidth = 0;
  for (const size of IMAGE_SIZES) {
    const { width } = targetSize(image.width, image.height, size);
    if (width === lastWidth) continue;
    lastWidth = width;
    entries.push(`${mediaUrl(kind, image.id, size)} ${width}w`);
  }
  return { src: mediaUrl(kind, image.id, 1600), srcSet: entries.join(", ") };
}

/** Alt-Text in der Sprache der Seite, sonst ein beschreibender Ersatz wie „Floorball, Foto 3“. */
export function altText(image: { altDe: string | null; altEn: string | null }, locale: "de" | "en", fallback: string): string {
  return (locale === "de" ? image.altDe : image.altEn)?.trim() || fallback;
}
