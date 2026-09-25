import { signPayload, verifyPayload } from "@/lib/auth/signed";

export const GALLERY_COOKIE = "cosmo_galerie";
export const VISITOR_COOKIE = "cosmo_besucher";
export const GALLERY_ACCESS_SECONDS = 30 * 24 * 60 * 60;

type GalleryRef = { id: string; passwordHash: string };
type Payload = { g: string; v: string; exp: number };

/** Ein Stück des Hashes: ändert sich mit dem Passwort → alte Zugänge werden ungültig. */
const passwordVersion = (passwordHash: string) => passwordHash.slice(-12);

export function createGalleryToken(secret: string, gallery: GalleryRef, nowSeconds: number): Promise<string> {
  return signPayload({ g: gallery.id, v: passwordVersion(gallery.passwordHash), exp: nowSeconds + GALLERY_ACCESS_SECONDS }, secret);
}

export async function verifyGalleryToken(token: string | undefined, secret: string, gallery: GalleryRef, nowSeconds: number): Promise<boolean> {
  const payload = await verifyPayload<Partial<Payload>>(token, secret);
  return (
    payload !== null &&
    payload.g === gallery.id &&
    payload.v === passwordVersion(gallery.passwordHash) &&
    typeof payload.exp === "number" &&
    payload.exp > nowSeconds
  );
}
