"use client";

import { useState } from "react";
import ImageCard from "./ImageCard";
import Lightbox from "./Lightbox";

interface PortfolioImage {
  id: string;
  titleDe: string | null;
  titleEn: string | null;
  width: number | null;
  height: number | null;
}

export default function PortfolioGrid({ images }: { images: PortfolioImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            index={index}
            onClick={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
