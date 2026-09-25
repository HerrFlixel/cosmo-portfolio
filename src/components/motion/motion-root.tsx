"use client";

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import { Cursor } from "./cursor";
import { MotionEffects } from "./motion-effects";
import { ScrollProgress } from "./scroll-progress";

type Motion = { enabled: boolean; lenis: RefObject<Lenis | null> };

const MotionContext = createContext<Motion>({ enabled: false, lenis: { current: null } });

export const useMotion = () => useContext(MotionContext);

const subscribe = () => () => {};
// bootMotion setzt die Klasse vor dem ersten Zeichnen; der Server kennt sie nicht (Snapshot false).
const readMotion = () => document.documentElement.classList.contains("has-motion");

/** Bewegung für die öffentliche Seite (Spec §4.4): Lenis nur mit Bewegung, gekoppelt an GSAP und ScrollTrigger. */
export function MotionRoot({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readMotion, () => false);
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (!enabled) return;
    const instance = new Lenis({ autoRaf: false, anchors: true });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Läuft das Intro schon (es startet vor diesem Effekt), bleibt das Scrollen gesperrt.
    if (document.documentElement.dataset.intro === "running") instance.stop();
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, [enabled]);

  // Neue Seite: oben beginnen (außer bei Sprungzielen wie #arbeiten) und ScrollTrigger neu vermessen.
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (!window.location.hash) lenis.current?.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [pathname]);

  return (
    <MotionContext value={{ enabled, lenis }}>
      {children}
      {enabled && (
        <>
          <MotionEffects />
          <ScrollProgress />
          <Cursor />
        </>
      )}
    </MotionContext>
  );
}
