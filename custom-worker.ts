// Eigener Einstieg vor dem generierten OpenNext-Worker
// (https://opennext.js.org/cloudflare/howtos/custom-worker).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` entsteht erst beim Build
import { default as handler } from "./.open-next/worker.js";
import { handleGalleryEdge } from "./src/edge/galleries";

/** Kaputte Prozent-Kodierung (z. B. /fu%DFball) endet in Next/OpenNext mit 500 – vorher abfangen. */
function hasMalformedPath(url: string): boolean {
  try {
    decodeURIComponent(new URL(url).pathname);
    return false;
  } catch {
    return true;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (hasMalformedPath(request.url)) {
      return new Response("400 · Ungültige Adresse / Bad request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    // Galerie-Dateien, Originale und ZIP direkt im Worker (streamend, ohne Next).
    const galleryResponse = await handleGalleryEdge(request, env, ctx);
    if (galleryResponse) return galleryResponse;
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
