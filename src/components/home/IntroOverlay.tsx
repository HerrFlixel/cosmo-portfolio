"use client";

import { useEffect, useState } from "react";
import CosmoLogo from "@/components/layout/CosmoLogo";

const PHOTOS = ["P", "H", "O", "T", "O", "S"];

export default function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    const t = setTimeout(onDone, skip ? 400 : 4000);
    return () => clearTimeout(t);
  }, [skip, onDone]);

  return (
    <div
      className={`intro-overlay ${skip ? "intro-skip" : ""}`}
      onClick={() => setSkip(true)}
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
