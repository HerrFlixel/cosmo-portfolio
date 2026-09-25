import type { Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

// Aufnahmen werden in einer leeren Seite dekodiert: Die Website selbst darf per CSP kein data:-fetch erlauben müssen.

/** Hellster und dunkelster Bildpunkt (Luminanz 0–255) im Kasten; nur der sichtbare Teil zählt. */
export async function luminance(page: Page, box: Box) {
  // Liegt nichts im Bild (z. B. Szene noch unterwegs), gilt „kein Kontrast“ und expect.poll versucht es erneut.
  const viewport = page.viewportSize()!;
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const clip = { x, y, width: Math.min(viewport.width, box.x + box.width) - x, height: Math.min(viewport.height, box.y + box.height) - y };
  if (clip.width < 4 || clip.height < 4) return { min: 255, max: 0 };
  const png = await page.screenshot({ clip });
  const decoder = await page.context().newPage();
  const range = await decoder.evaluate(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max };
  }, png.toString("base64"));
  await decoder.close();
  return range;
}

/** Anteil der Bildpunkte (0–1), die sich zwischen zwei gleich großen Aufnahmen deutlich unterscheiden. */
export async function difference(page: Page, a: Buffer, b: Buffer) {
  const decoder = await page.context().newPage();
  const share = await decoder.evaluate(
    async ([first, second]) => {
      const decode = async (data: string) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const [x, y] = await Promise.all([decode(first), decode(second)]);
      let changed = 0;
      for (let i = 0; i < x.length; i += 4) {
        if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 32) changed++;
      }
      return changed / (x.length / 4);
    },
    [a.toString("base64"), b.toString("base64")],
  );
  await decoder.close();
  return share;
}

/** Abstand (px) der untersten dunklen Bildpunktreihe vom oberen Rand des Kastens, z. B. für Unterlängen. */
export async function lowestInk(page: Page, box: Box) {
  const png = await page.screenshot({ clip: box });
  const decoder = await page.context().newPage();
  const row = await decoder.evaluate(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let lowest = -1;
    for (let i = 0; i < pixels.length; i += 4) {
      if (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2] < 100) lowest = Math.floor(i / 4 / bitmap.width);
    }
    return lowest;
  }, png.toString("base64"));
  await decoder.close();
  return row;
}
