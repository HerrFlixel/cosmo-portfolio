export const GALLERY_VARIANTS = ["thumb", "preview", "original"] as const;
export type GalleryVariant = (typeof GALLERY_VARIANTS)[number];

/** Schlüssel im privaten Bucket GALLERIES. */
export function galleryKey(galleryId: string, imageId: string, variant: GalleryVariant): string {
  return `${galleryId}/${imageId}/${variant}`;
}
