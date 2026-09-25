import { describe, expect, it } from "vitest";
import { GALLERY_ACCESS_SECONDS, createGalleryToken, verifyGalleryToken } from "@/lib/galleries/token";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const NOW = 1_800_000_000;
const gallery = { id: "g1", passwordHash: "pbkdf2-sha256$100000$salt$hashhashhashhash-A" };

describe("gallery access tokens", () => {
  it("grant access to exactly this gallery for 30 days", async () => {
    expect(GALLERY_ACCESS_SECONDS).toBe(30 * 24 * 60 * 60);
    const token = await createGalleryToken(SECRET, gallery, NOW);
    expect(await verifyGalleryToken(token, SECRET, gallery, NOW + GALLERY_ACCESS_SECONDS - 1)).toBe(true);
    expect(await verifyGalleryToken(token, SECRET, gallery, NOW + GALLERY_ACCESS_SECONDS)).toBe(false);
  });

  it("do not open another gallery", async () => {
    const token = await createGalleryToken(SECRET, gallery, NOW);
    expect(await verifyGalleryToken(token, SECRET, { ...gallery, id: "g2" }, NOW)).toBe(false);
  });

  it("stop working after the password was changed", async () => {
    const token = await createGalleryToken(SECRET, gallery, NOW);
    const changed = { ...gallery, passwordHash: "pbkdf2-sha256$100000$salt$anderesPasswortHash-B" };
    expect(await verifyGalleryToken(token, SECRET, changed, NOW)).toBe(false);
  });

  it("reject missing or foreign tokens", async () => {
    expect(await verifyGalleryToken(undefined, SECRET, gallery, NOW)).toBe(false);
    const foreign = await createGalleryToken("anderes-secret-mit-mindestens-32-zeichen", gallery, NOW);
    expect(await verifyGalleryToken(foreign, SECRET, gallery, NOW)).toBe(false);
  });
});
