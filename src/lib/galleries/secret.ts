import { getCloudflareContext } from "@opennextjs/cloudflare";

/** GALLERY_SECRET signiert Zugangs-Cookies und verschlüsselt Galerie-Passwörter (≥ 32 Zeichen). Nie rotieren, ohne danach alle Passwörter neu zu setzen. */
export function gallerySecret(): string {
  const secret = getCloudflareContext().env.GALLERY_SECRET;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error('GALLERY_SECRET fehlt oder ist kürzer als 32 Zeichen – per "wrangler secret put GALLERY_SECRET" setzen.');
  }
  return secret;
}
