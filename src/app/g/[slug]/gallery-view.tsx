"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, type Locale } from "@/lib/format";
import { DownloadButtons } from "./download-buttons";
import { Lightbox } from "./lightbox";
import { LocaleSwitch } from "./locale-switch";
import type { ViewImage } from "./types";

type Props = { slug: string; title: string; shootDate: string | null; expiresAt: string | null; coverId: string | null; images: ViewImage[] };

export function GalleryView({ slug, title, shootDate, expiresAt, coverId, images }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const meta = [
    shootDate ? formatDate(shootDate, locale) : null,
    t("images", { count: images.length }),
    expiresAt ? t("onlineUntil", { date: formatDate(expiresAt, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker
        <img src={`/g/${slug}/img/${coverId}/preview`} alt="" className="mb-10 aspect-[21/9] w-full object-cover" />
      )}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-label text-xs text-stone">Cosmo Photos</p>
          <h1 className="font-display mt-2 text-5xl">{title}</h1>
          <p className="mt-3 font-label text-xs text-stone">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-3 text-sm">
          <LocaleSwitch />
          <DownloadButtons slug={slug} set="all" images={images} primary />
        </div>
      </header>

      {images.length === 0 ? (
        <p className="mt-16 text-stone">{t("empty")}</p>
      ) : (
        <ul data-testid="gallery-grid" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((image, index) => (
            // content-visibility: Der Browser zeichnet nur sichtbare Kacheln (Spec §7.1, große Galerien).
            <li key={image.id} className="relative [contain-intrinsic-size:auto_320px] [content-visibility:auto]">
              <button type="button" data-testid="gallery-thumb" onClick={() => setOpen(index)} className="block w-full bg-mat p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
                <img
                  src={`/g/${slug}/img/${image.id}/thumb`}
                  alt={image.filename}
                  loading="lazy"
                  width={image.width}
                  height={image.height}
                  className="aspect-[4/5] w-full object-cover"
                  style={{ backgroundColor: image.color }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && <Lightbox slug={slug} images={images} index={open} onIndex={setOpen} onClose={close} />}
    </main>
  );
}
