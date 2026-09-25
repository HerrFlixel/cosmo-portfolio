"use client";

import { useEffect } from "react";
import { useMotion } from "./motion-root";

/** Sperrt das Scrollen, solange `active` gilt: mit Lenis über stop/start, sonst über overflow. */
export function useScrollLock(active: boolean) {
  const { lenis } = useMotion();
  useEffect(() => {
    if (!active) return;
    const instance = lenis.current;
    instance?.stop();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      instance?.start();
    };
  }, [active, lenis]);
}
