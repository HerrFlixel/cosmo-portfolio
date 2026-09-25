"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
};

/** Blendet weich ein, sobald das Bild geladen ist; bis dahin zeigt das Fenster den Hauptfarbton (Spec §4.3). */
export function Photo({ alt, priority = false, className = "", ...image }: Props) {
  const ref = useRef<HTMLImageElement>(null);

  // Aus dem Cache geladene Bilder feuern vor der Hydration kein onLoad mehr.
  useEffect(() => {
    const element = ref.current;
    if (element?.complete && element.naturalWidth > 0) element.dataset.loaded = "";
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- eigene Größen aus R2 (srcset), kein Next-Bildoptimierer
    <img
      ref={ref}
      {...image}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      // Prioritätsbilder (LCP) sofort zeigen; alle anderen blenden nach dem Laden ein.
      data-loaded={priority ? "" : undefined}
      onLoad={(event) => {
        event.currentTarget.dataset.loaded = "";
      }}
      className={`passepartout-photo ${className}`}
    />
  );
}
