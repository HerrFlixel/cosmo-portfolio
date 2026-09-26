// Eigener Einstieg vor dem generierten OpenNext-Worker
// (https://opennext.js.org/cloudflare/howtos/custom-worker).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` entsteht erst beim Build
import { default as handler } from "./.open-next/worker.js";
import { handleGalleryEdge } from "./src/edge/galleries";
import { BASE_SECURITY_HEADERS, HSTS, hostPolicy } from "./src/lib/site";

/** Kaputte Prozent-Kodierung (z. B. /fu%DFball) endet in Next/OpenNext mit 500 – vorher abfangen. */
function hasMalformedPath(url: string): boolean {
  try {
    decodeURIComponent(new URL(url).pathname);
    return false;
  } catch {
    return true;
  }
}

/** Grund-Header ergänzen (vorhandene bleiben), Zweitadressen auf noindex. Galerie-Dateien und ZIPs laufen daran vorbei. */
function withSiteHeaders(response: Response, indexable: boolean, secure: boolean): Response {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!result.headers.has(name)) result.headers.set(name, value);
  }
  if (secure) result.headers.set("Strict-Transport-Security", HSTS);
  if (!indexable) result.headers.set("X-Robots-Tag", "noindex, nofollow");
  return result;
}

export default {
  async fetch(request, env, ctx) {
    if (hasMalformedPath(request.url)) {
      return new Response("400 · Ungültige Adresse / Bad request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const url = new URL(request.url);
    const policy = hostPolicy(url);
    if (policy.redirect) return Response.redirect(policy.redirect, 301);
    // Galerie-Dateien, Originale und ZIP direkt im Worker (streamend, ohne Next). Unverändert durchreichen:
    // Die ZIP-Antwort braucht ihre feste Content-Length (Fortschrittsbalken).
    const galleryResponse = await handleGalleryEdge(request, env, ctx);
    if (galleryResponse) return galleryResponse;
    return withSiteHeaders(await handler.fetch(request, env, ctx), policy.indexable, url.protocol === "https:");
  },
} satisfies ExportedHandler<CloudflareEnv>;
