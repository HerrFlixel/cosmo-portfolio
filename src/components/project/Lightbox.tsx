"use client";

import { useEffect, useCallback } from "react";

interface LightboxProps {
  imageIds: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ imageIds, currentIndex, onClose, onNavigate }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowRight" && currentIndex < imageIds.length - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      }
    },
    [currentIndex, imageIds.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = savedOverflow;
    };
  }, [handleKeyDown]);

  const id = imageIds[currentIndex];
  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95"
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-6 text-white/70 hover:text-white text-3xl font-light z-10"
        onClick={onClose}
        aria-label="Schließen"
      >
        &times;
      </button>

      <div className="absolute top-6 left-6 text-white/60 font-mono text-xs">
        {String(currentIndex + 1).padStart(2, "0")} / {String(imageIds.length).padStart(2, "0")}
      </div>

      {currentIndex > 0 && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-light z-10 p-4"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          aria-label="Vorheriges Bild"
        >
          &#8249;
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={id}
        src={`/api/drive/image/${id}?w=1920`}
        alt=""
        className="max-h-[88vh] max-w-[92vw] object-contain fade-swap"
        onClick={(e) => e.stopPropagation()}
      />

      {currentIndex < imageIds.length - 1 && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-light z-10 p-4"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          aria-label="Nächstes Bild"
        >
          &#8250;
        </button>
      )}
    </div>
  );
}
