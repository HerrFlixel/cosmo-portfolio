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

  async function downloadAll() {
    setDownloading(true);
    try {
      const res = await fetch("/api/downloads/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cosmo-photos-${label}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-heading text-3xl tracking-wide">{label.toUpperCase()}</h2>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {downloading ? "..." : t("downloadAll")}
        </button>
      </div>

      {images.length === 0 ? (
        <p className="text-muted text-center py-12">Dieses Album enthält noch keine Fotos.</p>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={thumbUrl(image, 800)}
                alt={image.name}
                className="w-full h-auto"
                loading="lazy"
                decoding="async"
              />
              <a
                href={`/api/drive/file/${image.id}`}
                download={image.name}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-primary text-white text-xs tracking-nav uppercase opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
