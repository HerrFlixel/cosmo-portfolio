"use client";

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import { Cursor } from "./cursor";
import { MotionEffects } from "./motion-effects";
import { ScrollProgress } from "./scroll-progress";

type Motion = { enabled: boolean; lenis: RefObject<Lenis | null> };

const MotionContext = createContext<Motion>({ enabled: false, lenis: { current: null } });

export const useMotion = () => useContext(MotionContext);

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
// Wie bootMotion: Bewegung nur ohne „Bewegung reduzieren“. Der Server kennt die Einstellung nicht (Snapshot false).
const readMotion = () => !window.matchMedia(REDUCE).matches;

/** Bewegung für die öffentliche Seite (Spec §4.4): Lenis nur mit Bewegung, gekoppelt an GSAP und ScrollTrigger. */
export function MotionRoot({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readMotion, () => false);
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const previous = useRef(pathname);
  const mounted = useRef(false);

  // bootMotion setzt has-motion vor dem ersten Zeichnen. Ein Sprachwechsel baut <html> neu auf und verliert die Klasse,
  // deshalb hier nachziehen. Beim Hydrieren (Snapshot false) nie entfernen, sonst flackerten die Überschriften.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add("has-motion");
    else if (mounted.current) root.classList.remove("has-motion");
    mounted.current = true;
  }, [enabled]);

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

  // Scrollposition je Pfad merken, damit Zurück/Vor wieder dort landet, wo man war.
  const positions = useRef(new Map<string, number>());
  const popped = useRef(false);
  useEffect(() => {
    const onScroll = () => positions.current.set(previous.current, window.scrollY);
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Neue Seite: ScrollTrigger neu vermessen (Pins verlängern die Seite), dann bei Zurück/Vor die gemerkte Stelle,
  // sonst oben beginnen (außer bei Sprungzielen wie #arbeiten). Layout-Effekt: vor dem Schnappschuss des Vorhangs und
  // bevor ein Scroll-Ereignis der gekürzten Seite die Position der alten überschreibt.
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const back = popped.current ? positions.current.get(pathname) : undefined;
    popped.current = false;
    const instance = lenis.current;
    if (!instance) return;
    ScrollTrigger.refresh();
    instance.resize();
    if (back !== undefined) instance.scrollTo(back, { immediate: true, force: true });
    else if (!window.location.hash) instance.scrollTo(0, { immediate: true, force: true });
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
