"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatBytes, type Locale } from "@/lib/format";
import { zipPartsFor } from "@/lib/zip/zip";
import type { ViewImage } from "./types";

type Props = { slug: string; set: "all" | "favorites"; images: ViewImage[]; primary: boolean };

/** Ein Button pro ZIP-Teil (≤ 2 GB). Der Worker rechnet dieselbe Aufteilung (zipPartsFor, gleiche Reihenfolge). */
export function DownloadButtons({ slug, set, images, primary }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const parts = zipPartsFor(images);
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-2">
      {parts.map((part, index) => {
        const size = formatBytes(part.size, locale);
        const label =
          parts.length > 1
            ? t(set === "all" ? "downloadPart" : "downloadFavoritesPart", { part: index + 1, total: parts.length, size })
            : set === "all"
              ? t("downloadAll", { size })
              : t("downloadFavorites", { count: images.length });
        return (
          <a
            key={index}
            data-testid={set === "all" ? "download-all" : "download-favorites"}
            href={`/g/${slug}/zip?set=${set}${parts.length > 1 ? `&part=${index + 1}` : ""}`}
            className={primary ? "bg-ink px-6 py-3 text-paper" : "border border-ink px-4 py-2"}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
