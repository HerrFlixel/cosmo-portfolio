import { execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { expect, test } from "@playwright/test";
import { TINY_WEBP } from "./helpers/admin";
import { createGalleryViaUi, galleryPassword, newContext, publishGallery, RUN, unlockGallery } from "./helpers/galleries";

// Nur auf Zuruf gegen die Vorschau (npm run test:load): 1 100 Originale à 2 MiB (≈ 2,15 GiB) → 3 ZIP-Teile
// (≤ 500 Dateien je Teil). Erfolgskriterium 3 der Spec: mehrere GB zuverlässig herunterladen.
const FILES = 1100;
const BYTES = 2 * 1024 * 1024;
const PARTS = 3;

/** Gültiger JPEG-Anfang (SOI + APP0), danach Zufall: besteht die Typprüfung, lässt sich nicht komprimieren. */
function syntheticJpeg(): Buffer {
  const body = Buffer.alloc(BYTES);
  for (let offset = 0; offset < BYTES; offset += 65_536) crypto.getRandomValues(body.subarray(offset, Math.min(offset + 65_536, BYTES)));
  body.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return body;
}

test("Lasttest: 1 100 Originale hochladen, alle ZIP-Teile laden und mit unzip prüfen", async ({ browser, baseURL }) => {
  test.setTimeout(4 * 60 * 60 * 1000);
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  const { id, slug } = await createGalleryViaUi(page, `Lasttest ${RUN}`);

  const started = Date.now();
  let next = 0;
  const uploader = async () => {
    while (next < FILES) {
      const index = next++;
      const name = `LAST_${String(index + 1).padStart(4, "0")}.jpg`;
      const imageId = crypto.randomUUID();
      // Wie der echte Upload: erst Vorschau und Thumbnail (winzig), dann das Original, das das Bild registriert.
      for (const variant of ["thumb", "preview"]) {
        const put = await page.request.put(`/admin/api/galleries/${id}/images/${imageId}/${variant}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
        expect(put.status(), `${name} ${variant}`).toBe(204);
      }
      const response = await page.request.put(`/admin/api/galleries/${id}/images/${imageId}/original`, {
        data: syntheticJpeg(),
        headers: { "content-type": "image/jpeg", "x-file-name": encodeURIComponent(name), "x-width": "6000", "x-height": "4000", "x-color": "#5a6b7c" },
        timeout: 180_000,
      });
      expect(response.status(), `${name}: ${await response.text()}`).toBeLessThan(300);
    }
  };
  await Promise.all([uploader(), uploader(), uploader()]);
  console.log(`Upload: ${FILES} Dateien in ${Math.round((Date.now() - started) / 1000)} s`);

  await page.reload();
  await publishGallery(page);
  const password = await galleryPassword(page);
  const guest = await newContext(browser);
  await unlockGallery(await guest.newPage(), slug, password);
  const cookie = (await guest.cookies()).map((entry) => `${entry.name}=${entry.value}`).join("; ");

  mkdirSync("test-results/load", { recursive: true });
  for (let part = 1; part <= PARTS; part++) {
    const response = await fetch(`${baseURL}/g/${slug}/zip?set=all&part=${part}`, { headers: { cookie } });
    expect(response.status, `Teil ${part}`).toBe(200);
    const length = Number(response.headers.get("content-length"));
    expect(length, `Teil ${part}: Content-Length`).toBeGreaterThan(0);
    const file = `test-results/load/teil-${part}.zip`;
    const t0 = Date.now();
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(file));
    expect(statSync(file).size, `Teil ${part}: Größe`).toBe(length);
    execFileSync("unzip", ["-tq", file], { stdio: "inherit" });
    console.log(`Teil ${part}: ${(length / 1024 ** 3).toFixed(2)} GiB in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  expect((await fetch(`${baseURL}/g/${slug}/zip?set=all&part=${PARTS + 1}`, { headers: { cookie } })).status).not.toBe(200);
  await guest.close();
  rmSync("test-results/load", { recursive: true, force: true });

  // Aufräumen: Galerie samt R2-Dateien löschen.
  await page.goto(`/admin/galerien/${id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Galerie löschen" }).click();
  // ≈ 3 300 R2-Dateien löschen dauert (gemessen) länger als die üblichen 5 s.
  await expect(page).toHaveURL(/\/admin\/galerien$/, { timeout: 120_000 });
  await admin.close();
});
