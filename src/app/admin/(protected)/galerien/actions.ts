"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { GalleryError, createGallery } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";

export type NewGalleryState = { error?: string };

export async function createGalleryAction(_previous: NewGalleryState, formData: FormData): Promise<NewGalleryState> {
  await requireAdmin();
  let id: string;
  try {
    const { gallery } = await createGallery(
      getDb(),
      gallerySecret(),
      { title: String(formData.get("title") ?? ""), shootDate: String(formData.get("shootDate") ?? "") || null },
      new Date(),
    );
    id = gallery.id;
  } catch (cause) {
    if (cause instanceof GalleryError) return { error: cause.message };
    throw cause;
  }
  redirect(`/admin/galerien/${id}`);
}
