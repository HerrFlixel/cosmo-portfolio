"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
}

function thumbUrl(image: DownloadImage, size: number): string {
  if (image.thumbnailLink) {
    return image.thumbnailLink.replace(/=s\d+$/, `=s${size}`);
  }
  return `/api/drive/file/${image.id}`;
}

interface DownloadGalleryProps {
  label: string;
  images: DownloadImage[];
  code: string;
}

export default function DownloadGallery({ label, images, code }: DownloadGalleryProps) {
  const t = useTranslations("downloads");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadAll() {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/downloads/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        setError(t("invalid"));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cosmo-photos-${label}.zip`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(t("invalid"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">{label}</h2>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="bg-ink text-paper text-xs tracking-[.1em] uppercase px-6 py-3 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {downloading ? "…" : `${t("downloadAll")} ↓`}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-6">{error}</p>}

      {images.length === 0 ? (
        <p className="text-fog text-center py-12 text-sm">{t("emptyAlbum")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-[3/2] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(image, 800)}
                alt={image.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <a
                href={`/api/drive/file/${image.id}`}
                download={image.name}
                className="absolute bottom-2.5 right-2.5 bg-ink text-paper font-mono text-[10px] tracking-[.1em] uppercase px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ↓
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
