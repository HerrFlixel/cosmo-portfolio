"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): führt vom Galerie-Code zur Passwortseite der Galerie.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/env";
import { isLockedOut, recordFailure } from "@/lib/galleries/attempts";
import { getGalleryBySlug } from "@/lib/galleries/repo";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

export type CodeState = { error?: "invalid" | "unknown" | "tooMany"; code?: string };

export async function openGalleryAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "");
  const slug = galleryCodeToSlug(code);
  if (!slug) return { error: "invalid", code };
  // Bremst das Durchprobieren von Codes: nur unbekannte Codes zählen (eigener Schlüssel pro Adresse).
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const key = `code:${ip}`;
  if (await isLockedOut(db, key, now)) return { error: "tooMany", code };
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || gallery.status === "draft") {
    await recordFailure(db, key, now);
    return { error: "unknown", code };
  }
  redirect(`/g/${slug}`);
}
