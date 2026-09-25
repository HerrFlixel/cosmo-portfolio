"use client";

import { useTransition } from "react";
import { deleteGalleryAction } from "./actions";

export function DeleteGalleryButton({ galleryId }: { galleryId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-signal underline"
      onClick={() => {
        if (!window.confirm("Galerie und alle Fotos endgültig löschen?")) return;
        start(() => deleteGalleryAction(galleryId));
      }}
    >
      Galerie löschen
    </button>
  );
}
