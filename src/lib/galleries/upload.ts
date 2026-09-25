import { processImage } from "@/lib/image/process";
import { putWithRetry } from "@/lib/image/upload";
import type { GalleryImage } from "./repo";

/**
 * Vorschau (800) und Web-Größe (2400) entstehen im Browser, danach geht das unveränderte Original hoch.
 * Der Worker streamt es, zählt CRC32 und Größe und legt erst dann den Datenbank-Eintrag an.
 */
export async function uploadGalleryImage(galleryId: string, file: File): Promise<GalleryImage> {
  if (file.type !== "image/jpeg") throw new Error("Originale müssen JPEG sein.");
  const processed = await processImage(file, [800, 2400]);
  const id = crypto.randomUUID();
  const base = `/admin/api/galleries/${galleryId}/images/${id}`;
  await putWithRetry(`${base}/thumb`, processed.variants[0].blob);
  await putWithRetry(`${base}/preview`, processed.variants[1].blob);
  const response = await putWithRetry(`${base}/original`, file, {
    "content-type": "image/jpeg",
    "x-file-name": encodeURIComponent(file.name),
    "x-width": String(processed.width),
    "x-height": String(processed.height),
    "x-color": processed.color,
  });
  return (await response.json()) as GalleryImage;
}
