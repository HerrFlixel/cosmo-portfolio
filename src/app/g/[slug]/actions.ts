"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): Sie prüft das Galerie-Passwort und erzeugt erst den Zugang.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/env";
import { checkGalleryPassword, galleryState, getGalleryBySlug } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { GALLERY_ACCESS_SECONDS, GALLERY_COOKIE, createGalleryToken } from "@/lib/galleries/token";

export type UnlockState = { error?: "wrongPassword" | "tooMany" };

export async function unlockGalleryAction(slug: string, _previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.GALLERY_LIMITER.limit({ key: `gallery:${ip}:${slug}` });
  if (!success) return { error: "tooMany" };

  const gallery = await getGalleryBySlug(getDb(), slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") redirect(`/g/${slug}`);
  if (!(await checkGalleryPassword(gallery, String(formData.get("password") ?? "")))) return { error: "wrongPassword" };

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
