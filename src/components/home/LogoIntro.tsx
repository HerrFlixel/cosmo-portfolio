"use client";

import { useEffect, useRef, useState } from "react";
import CosmoLogo from "@/components/layout/CosmoLogo";

const PHOTOS = ["P", "H", "O", "T", "O", "S"];
const SKIP_CUTOFF_MS = 2000;
// "cosmo" letters bbox width minus this many viewBox units on the right edge,
// so the PHOTOS "S" sits flush under the last "o" (resolution-independent).
const RIGHT_TRIM_UNITS = 8;
const VIEW_W = 222.94;

export default function LogoIntro({
  onReveal,
  onDone,
}: {
  onReveal: () => void;
  onDone: () => void;
}) {
  const [skip, setSkip] = useState(false);
  const mountedAt = useRef(Date.now());
  const markRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);

  const requestSkip = () => {
    if (Date.now() - mountedAt.current < SKIP_CUTOFF_MS) setSkip(true);
  };

  // Distribute PHOTOS to span exactly the width of the "cosmo" letters.
  useEffect(() => {
    const layout = () => {
      const mark = markRef.current;
      const photos = photosRef.current;
      if (!mark || !photos) return;
      const svg = mark.querySelector("svg");
      const letters = mark.querySelector(".intro-letters") as SVGGElement | null;
      if (!svg || !letters) return;
      const svgW = svg.getBoundingClientRect().width;
      if (!svgW) return;
      const ppu = svgW / VIEW_W;
      let bb: DOMRect;
      try {
        bb = letters.getBBox();
      } catch {
        return;
      }
      const leftPx = bb.x * ppu;
      const rightPx = (bb.x + bb.width - RIGHT_TRIM_UNITS) * ppu;
      photos.style.marginLeft = `${leftPx}px`;
      photos.style.width = `${rightPx - leftPx}px`;
    };
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, []);

  useEffect(() => {
    const revealMs = skip ? 350 : 2300; // curtain lifting -> slide the nav in beneath
    const doneMs = skip ? 600 : 3100; // overlay fully gone
    const r = setTimeout(onReveal, revealMs);
    const d = setTimeout(onDone, doneMs);
    const onKey = () => requestSkip();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(r);
      clearTimeout(d);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, onReveal, onDone]);

  return (
    <div
      className={`logo-intro ${skip ? "logo-skip" : ""}`}
      onClick={requestSkip}
      aria-hidden="true"
    >
      <div className="logo-intro-mark" ref={markRef}>
        <CosmoLogo
          className="logo-intro-logo"
          letterClass="intro-letters"
          swooshClass="intro-swoosh"
        />
        <span className="logo-intro-sheen" />
        <div className="logo-intro-photos" ref={photosRef}>
          {PHOTOS.map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
