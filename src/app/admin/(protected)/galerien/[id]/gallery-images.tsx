"use client";

import { useState, useTransition } from "react";
import { UploadZone } from "@/components/admin/upload-zone";
import { formatBytes } from "@/lib/format";
import type { GalleryImage } from "@/lib/galleries/repo";
import { uploadGalleryImage } from "@/lib/galleries/upload";
import { removeGalleryImageAction, setCoverAction } from "./actions";

type Props = { galleryId: string; coverImageId: string | null; initialImages: GalleryImage[] };

// Gleiche Reihenfolge wie die Datenbank (Dateiname ohne Groß/Klein-Unterschied).
const byName = (a: GalleryImage, b: GalleryImage) => a.filename.localeCompare(b.filename, "de", { sensitivity: "base" });

export function GalleryImages({ galleryId, coverImageId, initialImages }: Props) {
  const [images, setImages] = useState(initialImages);
  const [cover, setCover] = useState(coverImageId);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    const image = await uploadGalleryImage(galleryId, file);
    setImages((current) => [...current, image].sort(byName));
  }

  function makeCover(imageId: string) {
    startTransition(async () => {
      const result = await setCoverAction(galleryId, imageId);
      if (result.error) setError(result.error);
      else setCover(imageId);
    });
  }

  function remove(image: GalleryImage) {
    if (!window.confirm(`${image.filename} aus der Galerie entfernen?`)) return;
    startTransition(async () => {
      const result = await removeGalleryImageAction(galleryId, image.id);
      if (result.error) setError(result.error);
      else setImages((current) => current.filter((i) => i.id !== image.id));
    });
  }

  return (
    <div className="space-y-6">
      <UploadZone onUpload={upload} />
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      <p className="text-sm text-stone">
        {images.length} Bilder · {formatBytes(images.reduce((sum, image) => sum + image.bytes, 0), "de")}
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {images.map((image) => (
          <li key={image.id} data-testid="gallery-image" className="bg-mat p-2 text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau kommt aus dem privaten Bucket über den Worker */}
            <img
              src={`/admin/api/galleries/${galleryId}/images/${image.id}/thumb`}
              alt=""
              loading="lazy"
              width={image.width}
              height={image.height}
              className="aspect-square w-full object-cover"
              style={{ backgroundColor: image.color }}
            />
            <p className="mt-2 truncate font-label">{image.filename}</p>
            <div className="mt-1 flex justify-between gap-2">
              {cover === image.id ? (
                <span data-testid="cover-badge" className="text-stone">Titelbild</span>
              ) : (
                <button type="button" className="underline" onClick={() => makeCover(image.id)}>
                  Als Titelbild
                </button>
              )}
              <button type="button" className="text-signal underline" onClick={() => remove(image)}>
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
