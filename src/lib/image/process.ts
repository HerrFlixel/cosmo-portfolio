import { IMAGE_SIZES, type ImageSize } from "@/lib/media/keys";

export type ProcessedImage = {
  width: number;
  height: number;
  color: string;
  variants: { size: ImageSize; blob: Blob }[];
};

/** Dreht, skaliert und kodiert ein Bild in einem Web Worker (blockiert die Oberfläche nicht). */
export function processImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./process.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ProcessedImage | { error: string }>) => {
      worker.terminate();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Bild konnte nicht verarbeitet werden."));
    };
    worker.postMessage({ file, sizes: IMAGE_SIZES });
  });
}
