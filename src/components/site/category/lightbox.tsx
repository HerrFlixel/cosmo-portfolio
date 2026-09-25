"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { imageSources } from "@/lib/public/images";

export type LightboxImage = { id: string; width: number; height: number; color: string; alt: string };

type Props = { images: LightboxImage[]; index: number; onIndex: (index: number) => void; onClose: () => void };

/** Lightbox „Licht aus“ (Spec §6.2): Hallenschwarz, Pfeiltasten, Wischen, ESC, dezenter Positionszähler. */
export function PublicLightbox({ images, index, onIndex, onClose }: Props) {
  const t = useTranslations("lightbox");
  const image = images[index];
  const { src, srcSet } = imageSources("portfolio", image);
  const closeButton = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);

  // Scrollen sperren; Auslöser merken, bevor der Fokus in die Lightbox springt, und beim Schließen zurückgeben.
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

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < images.length) onIndex(next);
  };

  // Portal: Die Kategorieseite ist ein eigener Stapelkontext (z-10); die Lightbox muss über Kopf und Pille liegen.
  return createPortal(
    <div
      data-testid="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-50 flex touch-none select-none flex-col bg-hall text-hall-ink"
      onPointerDown={(event) => {
        swipeStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (start === null) return;
        const distance = event.clientX - start;
        if (Math.abs(distance) > 60) go(distance < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <p aria-live="polite" className="font-label text-xs text-hall-ink/70">
          {index + 1} / {images.length}
        </p>
        <button ref={closeButton} type="button" onClick={onClose} className="font-label text-xs uppercase tracking-[0.12em]">
          {t("close")}
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-10 md:px-24">
        {/* eslint-disable-next-line @next/next/no-img-element -- eigene Größen aus R2 (srcset) */}
        <img
          key={image.id}
          src={src}
          srcSet={srcSet}
          sizes="100vw"
          alt={image.alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{ aspectRatio: `${image.width} / ${image.height}`, backgroundColor: image.color }}
        />
        {index > 0 && (
          <button type="button" aria-label={t("previous")} onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 p-4 text-2xl md:block">
            ←
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" aria-label={t("next")} onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 p-4 text-2xl md:block">
            →
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
