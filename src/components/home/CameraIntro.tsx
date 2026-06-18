"use client";

import { useEffect, useRef, useState } from "react";
import CameraBar from "@/components/layout/CameraBar";
import CosmoLogo from "@/components/layout/CosmoLogo";

// Nach diesem Zeitpunkt läuft die Andock-Phase bereits — ein Skip würde rucklern.
const SKIP_CUTOFF_MS = 1500;

export default function CameraIntro({
  onReveal,
  onDone,
}: {
  onReveal: () => void;
  onDone: () => void;
}) {
  const [skip, setSkip] = useState(false);
  const [exiting, setExiting] = useState(false);
  const mountedAt = useRef(Date.now());

  const requestSkip = () => {
    if (Date.now() - mountedAt.current < SKIP_CUTOFF_MS) setSkip(true);
  };

  useEffect(() => {
    const revealMs = skip ? 400 : 1900; // Andock erreicht → Menü darunter einblenden
    const doneMs = skip ? 600 : 2350; // nach Crossfade → Overlay weg
    const r = setTimeout(() => {
      setExiting(true);
      onReveal();
    }, revealMs);
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
      className={`cam-scene ${skip ? "cam-skip" : ""} ${exiting ? "cam-exit" : ""}`}
      onClick={requestSkip}
      aria-hidden="true"
    >
      <div className="cam-backdrop" />
      <div className="cam-rig">
        <div className="cam-face cam-front">
          <div className="cam-top-plate">
            <span className="cam-hotshoe" />
            <span className="cam-tdial cam-tdial-1" />
            <span className="cam-tdial cam-tdial-2" />
          </div>
          <span className="cam-lug cam-lug-l" />
          <span className="cam-lug cam-lug-r" />
          <CosmoLogo className="cam-brand" />
          <div className="cam-lens">
            <span className="cam-knurl" />
            <span className="cam-engrave">
              <span className="cam-eng-top">COSMO</span>
              <span className="cam-eng-bot">1 : 1.7 / 28 ASPH.</span>
            </span>
            <span className="cam-glass" />
          </div>
        </div>
        <div className="cam-face cam-back" />
        <div className="cam-face cam-left" />
        <div className="cam-face cam-right" />
        <div className="cam-face cam-bottom" />
        <div className="cam-face cam-top">
          <div className="cam">
            <span className="cam-shadow" />
            <CameraBar activePath="/" decorative />
          </div>
        </div>
      </div>
    </div>
  );
}
