"use client";

import { useCallback, useState } from "react";
import { Passepartout } from "@/components/site/passepartout";
import type { Box } from "@/lib/motion/geometry";
import { PublicLightbox, type LightboxImage } from "./lightbox";

// Drei lockere, versetzte Spalten (Spec §6.2).
const COLUMN_OFFSETS = ["", "lg:mt-[24vh]", "lg:mt-[10vh]"];
// Unterschiedliches Scrolltempo pro Spalte (Spec §6.2); unter lg lösen sich die Spalten auf, dann wirkt es nicht.
const COLUMN_SPEEDS: (string | undefined)[] = [undefined, "0.18", "0.08"];

export function CategoryGrid({ images }: { images: LightboxImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<Box | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const columns = COLUMN_OFFSETS.map((_, column) =>
    images.map((image, index) => ({ image, index })).filter(({ index }) => index % 3 === column),
  );

  return (
    <>
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-8 sm:px-14 md:grid-cols-2 md:gap-x-12 md:px-8 lg:grid-cols-3 lg:gap-x-[6vw]">
        {columns.map((column, c) => (
          // Unter lg lösen sich die Spalten auf (display: contents); `order` hält dort die Admin-Reihenfolge.
          <div key={c} data-speed={COLUMN_SPEEDS[c]} className={`contents lg:flex lg:flex-col lg:gap-[16vh] ${COLUMN_OFFSETS[c]}`}>
            {column.map(({ image, index }) => (
              <button
                key={image.id}
                type="button"
                aria-haspopup="dialog"
                onClick={(event) => {
                  const frame = event.currentTarget.querySelector(".passepartout-window")?.getBoundingClientRect();
                  setOrigin(frame ? { left: frame.left, top: frame.top, width: frame.width, height: frame.height } : null);
                  setOpen(index);
                }}
                style={{ order: index }}
                className="block w-full cursor-zoom-in text-left"
              >
                <Passepartout image={image} alt={image.alt} sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 86vw" />
              </button>
            ))}
          </div>
        ))}
      </div>
      {open !== null && <PublicLightbox images={images} index={open} origin={origin} onIndex={setOpen} onClose={close} />}
    </>
  );
}
