"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): Sie prüft das Galerie-Passwort und erzeugt erst den Zugang.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/env";
import { isLockedOut, recordFailure } from "@/lib/galleries/attempts";
import { checkGalleryPassword, galleryState, getGalleryBySlug } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { GALLERY_ACCESS_SECONDS, GALLERY_COOKIE, createGalleryToken } from "@/lib/galleries/token";

export type UnlockState = { error?: "wrongPassword" | "tooMany" };

export async function unlockGalleryAction(slug: string, _previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const key = `gallery:${ip}:${slug}`;
  if (await isLockedOut(db, key, now)) return { error: "tooMany" };

  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") redirect(`/g/${slug}`);
  if (!(await checkGalleryPassword(gallery, String(formData.get("password") ?? "")))) {
    await recordFailure(db, key, now);
    return { error: "wrongPassword" };
  }

  const token = await createGalleryToken(gallerySecret(), gallery, Math.floor(Date.now() / 1000));
  (await cookies()).set(GALLERY_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/g/${slug}`,
    maxAge: GALLERY_ACCESS_SECONDS,
  });
  redirect(`/g/${slug}`);
}
