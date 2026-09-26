"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): führt vom Galerie-Code zur Passwortseite der Galerie.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/env";
import { beginAttempt, forgetAttempt, UNLOCK_LIMIT } from "@/lib/galleries/attempts";
import { getGalleryBySlug } from "@/lib/galleries/repo";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

export type CodeState = { error?: "invalid" | "unknown" | "tooMany"; code?: string };

export async function openGalleryAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "");
  const slug = galleryCodeToSlug(code);
  if (!slug) return { error: "invalid", code };
  // Bremst das Durchprobieren von Codes: Gefundene Codes werden wieder herausgenommen, nur unbekannte zählen.
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const key = `code:${ip}`;
  const attempt = await beginAttempt(db, key, now);
  if (attempt.attempts > UNLOCK_LIMIT) return { error: "tooMany", code };
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || gallery.status === "draft") return { error: "unknown", code };
  await forgetAttempt(db, attempt.id);
  redirect(`/g/${slug}`);
}
