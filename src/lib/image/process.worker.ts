import { averageColor, targetSize } from "./sizing";

type Job = { file: File; sizes: readonly number[] };
// Worker-Kontext ohne die "webworker"-Lib (die kollidiert mit "dom" in derselben tsconfig).
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Job>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = async (event) => {
  try {
    const { file, sizes } = event.data;
    // from-image: EXIF-Drehung (Handy, Hochformat aus der Kamera) wird eingerechnet.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const variants: { size: number; blob: Blob }[] = [];
    for (const size of sizes) {
      const { width, height } = targetSize(bitmap.width, bitmap.height, size);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas ist nicht verfügbar.");
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      variants.push({ size, blob: await encode(canvas) });
    }
    const probe = new OffscreenCanvas(16, 16);
    const probeContext = probe.getContext("2d");
    if (!probeContext) throw new Error("Canvas ist nicht verfügbar.");
    probeContext.drawImage(bitmap, 0, 0, 16, 16);
    const color = averageColor(probeContext.getImageData(0, 0, 16, 16).data);
    const result = { width: bitmap.width, height: bitmap.height, color, variants };
    bitmap.close();
    scope.postMessage(result);
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : "Bild konnte nicht gelesen werden." });
  }
};

async function encode(canvas: OffscreenCanvas): Promise<Blob> {
  const webp = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
  if (webp.type === "image/webp") return webp;
  // Browser ohne WebP-Encoder (z. B. manche Safari-Versionen) liefern PNG → dann JPEG.
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}
