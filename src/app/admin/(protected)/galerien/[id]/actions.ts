"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { endOfBerlinDay } from "@/lib/format";
import { generateGalleryPassword } from "@/lib/galleries/password";
import { GalleryError, deleteGallery, extendGallery, removeImage, setGalleryPassword, updateGallery } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";

export type ActionState = { error?: string; ok?: boolean };

const detailPath = (id: string) => `/admin/galerien/${id}`;

/** Anmeldung prüfen, Arbeit ausführen, fachliche Fehler als Meldung zurückgeben, Seite neu laden. */
async function guarded(id: string, work: () => Promise<unknown>): Promise<ActionState> {
  await requireAdmin();
  try {
    await work();
  } catch (cause) {
    if (cause instanceof GalleryError) return { error: cause.message };
    throw cause;
  }
  revalidatePath(detailPath(id));
  return { ok: true };
}

export async function updateGalleryAction(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const unlimited = formData.get("unlimited") === "on";
  const expiry = String(formData.get("expiresAt") ?? "");
  return guarded(id, async () => {
    if (!unlimited && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      throw new GalleryError("Bitte ein Datum wählen oder „Unbegrenzt online“ ankreuzen.");
    }
    await updateGallery(getDb(), id, {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "").trim(),
      shootDate: String(formData.get("shootDate") ?? "") || null,
      expiresAt: unlimited ? null : endOfBerlinDay(expiry),
    });
  });
}

export async function setPasswordAction(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(id, () => setGalleryPassword(getDb(), gallerySecret(), id, String(formData.get("password") ?? "")));
}

export async function regeneratePasswordAction(id: string): Promise<ActionState> {
  return guarded(id, () => setGalleryPassword(getDb(), gallerySecret(), id, generateGalleryPassword()));
}

export async function setCoverAction(id: string, imageId: string): Promise<ActionState> {
  return guarded(id, () => updateGallery(getDb(), id, { coverImageId: imageId }));
}

export async function removeGalleryImageAction(id: string, imageId: string): Promise<ActionState> {
  return guarded(id, () => removeImage(getDb(), getEnv().GALLERIES, id, imageId));
}

export async function setStatusAction(id: string, status: "draft" | "online"): Promise<void> {
  await requireAdmin();
  await updateGallery(getDb(), id, { status });
  revalidatePath(detailPath(id));
}

export async function extendGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await extendGallery(getDb(), id, new Date());
  revalidatePath(detailPath(id));
}

export async function deleteGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteGallery(getDb(), getEnv().GALLERIES, id);
  redirect("/admin/galerien");
}
