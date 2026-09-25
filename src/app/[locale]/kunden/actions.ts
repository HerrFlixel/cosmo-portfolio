"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): führt vom Galerie-Code zur Passwortseite der Galerie.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/env";
import { getGalleryBySlug } from "@/lib/galleries/repo";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

export type CodeState = { error?: "invalid" | "unknown" | "tooMany"; code?: string };

export async function openGalleryAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "");
  const slug = galleryCodeToSlug(code);
  if (!slug) return { error: "invalid", code };
  // Bremst das Durchprobieren von Codes (gleiches Binding wie die Passwortseite, eigener Schlüssel).
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.GALLERY_LIMITER.limit({ key: `code:${ip}` });
  if (!success) return { error: "tooMany", code };
  const gallery = await getGalleryBySlug(getDb(), slug);
  if (!gallery || gallery.status === "draft") return { error: "unknown", code };
  redirect(`/g/${slug}`);
}
