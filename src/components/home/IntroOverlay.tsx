"use client";

import { useEffect, useRef, useState } from "react";
import CosmoLogo from "@/components/layout/CosmoLogo";

const PHOTOS = ["P", "H", "O", "T", "O", "S"];
// Nach diesem Zeitpunkt läuft bereits die Lift-Animation — ein Skip würde sie
// neu starten (sichtbarer Ruckler) und spart ohnehin kaum noch Zeit.
const SKIP_CUTOFF_MS = 2800;

export default function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [skip, setSkip] = useState(false);
  const mountedAt = useRef(Date.now());

  const requestSkip = () => {
    if (Date.now() - mountedAt.current < SKIP_CUTOFF_MS) setSkip(true);
  };

  useEffect(() => {
    const t = setTimeout(onDone, skip ? 400 : 4000);
    const onKeyDown = () => requestSkip();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, onDone]);

  return (
    <div
      className={`intro-overlay ${skip ? "intro-skip" : ""}`}
      onClick={requestSkip}
      aria-hidden="true"
    >
      <CosmoLogo
        className="w-[260px] md:w-[340px] text-ink"
        letterClass="intro-letters"
        swooshClass="intro-swoosh"
      />
      <div className="intro-photos flex gap-[1.45em] mt-4 ml-[0.7em] text-[15px] font-medium text-ink">
        {PHOTOS.map((ch, i) => (
          <span key={i} style={{ animationDelay: skip ? "0s" : `${1.7 + i * 0.08}s` }}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
