"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

export default function ProjectGallery({ imageIds }: { imageIds: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {imageIds.map((id, i) => (
          <button
            key={id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-[3/2] overflow-hidden"
            aria-label={`Bild ${i + 1} öffnen`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/drive/image/${id}?w=800`}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          imageIds={imageIds}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
