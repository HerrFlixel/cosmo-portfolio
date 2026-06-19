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
  const morphRef = useRef<HTMLDivElement>(null);
  const swapped = useRef(false);

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
      photos.style.marginLeft = `${bb.x * ppu}px`;
      photos.style.width = `${(bb.width - RIGHT_TRIM_UNITS) * ppu}px`;
    };
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, []);

  // Flash-free hand-off: at the instant the morph finishes shrinking to the bar
  // box, remove the morph and reveal the real (pixel-identical) nav in one frame.
  useEffect(() => {
    const swap = () => {
      if (swapped.current) return;
      swapped.current = true;
      const cam = morphRef.current;
      if (cam) cam.style.display = "none";
      onReveal();
      window.setTimeout(onDone, 450);
    };

    const cam = morphRef.current;
    if (!cam) return;

    // 1) start full-screen (no transition), 2) after the logo reveal, shrink to
    //    the bar box, 3) swap on transitionend (with a fallback timer).
    const startFullscreen = () => {
      const r = cam.getBoundingClientRect();
      if (!r.width) return;
      const padX = 60;
      const padTop = 340;
      const padBot = 60;
      const sx = (window.innerWidth + padX * 2) / r.width;
      const sy = (window.innerHeight + padTop + padBot) / r.height;
      cam.style.transition = "none";
      cam.style.transform = `translate(${-padX - r.left}px, ${-padTop - r.top}px) scale(${sx}, ${sy})`;
    };
    startFullscreen();
    void cam.offsetWidth; // commit the start state

    const startDelay = skip ? 80 : 2150;
    const dur = skip ? 360 : 950;
    const shrink = window.setTimeout(() => {
      cam.style.transition = `transform ${dur}ms cubic-bezier(0.7, 0, 0.2, 1)`;
      cam.style.transform = "none"; // -> exactly the real bar box
    }, startDelay);
    const fallback = window.setTimeout(swap, startDelay + dur + 120);

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform") swap();
    };
    const onKey = () => requestSkip();
    cam.addEventListener("transitionend", onEnd);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(shrink);
      window.clearTimeout(fallback);
      cam.removeEventListener("transitionend", onEnd);
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
      <div className="logo-morph-pos">
        <div className="cam logo-morph-cam" ref={morphRef}>
          <span className="cam-shadow" />
        </div>
      </div>

      <div className="logo-intro-stage">
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
    </div>
  );
}
