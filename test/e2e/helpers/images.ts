import type { Page } from "@playwright/test";

/** Erzeugt ein JPEG im Browser: Grundfarbe plus weißes Feld oben links (so ist die Ausrichtung prüfbar). */
export async function makeJpeg(page: Page, width: number, height: number, color: string): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ width, height, color }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width / 4, height / 4);
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    { width, height, color },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** Fügt ein EXIF-Segment mit „Orientation“ ein (6 = um 90° im Uhrzeigersinn drehen, typisch für Hochformat-Fotos). */
export function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // Big Endian, erster IFD bei Offset 8
    0, 1, // ein Eintrag
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, // Orientation, SHORT, 1 Wert
    0, 0, 0, 0, // kein weiterer IFD
  ]);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const length = payload.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, length >> 8, length & 0xff]), payload]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}
