"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ViewImage } from "./types";

type Props = {
  slug: string;
  images: ViewImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  favorite?: { active: boolean; onToggle: () => void };
};

export function Lightbox({ slug, images, index, onIndex, onClose, favorite }: Props) {
  const t = useTranslations("gallery");
  const image = images[index];
  const closeButton = useRef<HTMLButtonElement>(null);

  // Scrollen sperren und den Fokus beim Schließen dorthin zurückgeben, wo er vorher war (Tastaturbedienung).
  // Erst den Auslöser merken, dann fokussieren – autoFocus käme React zuvor.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onIndex]);

  return (
    <div data-testid="lightbox" role="dialog" aria-modal="true" aria-label={image.filename} className="fixed inset-0 z-50 flex flex-col bg-hall/95 text-hall-ink">
      <div className="flex items-center justify-between p-4 font-label text-xs">
        <span>
          {index + 1} / {images.length}
        </span>
        <button ref={closeButton} type="button" onClick={onClose} className="underline">
          {t("close")}
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
        {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
        <img
          key={image.id}
          src={`/g/${slug}/img/${image.id}/preview`}
          alt={image.filename}
          className="max-h-full max-w-full object-contain"
          style={{ backgroundColor: image.color, aspectRatio: `${image.width} / ${image.height}` }}
        />
        {index > 0 && (
          <button type="button" aria-label={t("previous")} onClick={() => onIndex(index - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-2xl">
            ←
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" aria-label={t("next")} onClick={() => onIndex(index + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-2xl">
            →
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 p-4 text-sm">
        {favorite && (
          <button type="button" onClick={favorite.onToggle} aria-pressed={favorite.active} className="underline">
            {favorite.active ? `♥ ${t("unfavorite")}` : `♡ ${t("favorite")}`}
          </button>
        )}
        <a href={`/g/${slug}/img/${image.id}/original`} download={image.filename} className="underline">
          {t("download")}
        </a>
      </div>
    </div>
  );
}
