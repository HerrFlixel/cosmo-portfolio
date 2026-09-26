"use client";

import { useRef } from "react";
import { INTRO_SEEN_KEY } from "@/lib/motion/boot";
import { introStart } from "@/lib/motion/geometry";
import { LOGO_LETTER_DELAYS } from "@/lib/motion/logo-pieces";
import { gsap, useGSAP } from "./gsap";
import { useMotion } from "./motion-root";

// Übergabe (Spec §5.2): PHOTOS geht, das Logo fliegt in den Kopf, der Vorhang hebt sich; ≈ 3,2 s steht die Seite frei.
const HANDOVER = 2.15;

/**
 * Intro „Orbit“ beim ersten Besuch der Startseite pro Sitzung, als „Seite zuerst“ (Plan 6): Die Startseite ist schon
 * gezeichnet (schnelles LCP) und liegt unter einem Papier-Vorhang. Darüber zieht der Ring seine Bahn, C-O-S-M-O wachsen
 * aus ihm, PHOTOS setzt sich; dann fliegt das Kopf-Logo – dasselbe Element, per FLIP – an seinen Platz, der Vorhang
 * hebt sich und die Seite rückt nach (nur transform). Klick, Tipp oder Taste springen ans Ende.
 */
export function HomeIntro() {
  const { lenis } = useMotion();
  const released = useRef(false);

  useGSAP(() => {
    const root = document.documentElement;
    const logo = document.querySelector<HTMLElement>("[data-site-logo]");
    const svg = logo?.querySelector("svg");
    const mask = svg?.querySelector<SVGPathElement>("[data-ring-mask]");
    const curtain = document.querySelector<HTMLElement>("[data-intro-curtain]");
    if (root.dataset.intro !== "pending" || !logo || !svg || !mask || !curtain) return;

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "seen");
    } catch {
      // ohne Speicher läuft das Intro eben bei jedem Besuch
    }
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    lenis.current?.stop();

    const photos = svg.querySelector<SVGGElement>("[data-logo-photos]");
    const page = gsap.utils.toArray<HTMLElement>("[data-intro='headline'], [data-intro='collage']");
    const nav = gsap.utils.toArray<HTMLElement>("nav[data-intro='nav'] > *, button[data-intro='nav']");
    const from = introStart(logo.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
    const length = mask.getTotalLength();

    // Startzustände sofort (vor dem nächsten Zeichnen), erst dann „running“ (zeigt das Logo).
    gsap.set(logo, { x: from.x, y: from.y, scale: from.scale, transformOrigin: "0 0" });
    gsap.set(mask, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length });
    gsap.set(svg.querySelectorAll("[data-piece='u']"), { y: 44 });
    gsap.set(svg.querySelectorAll("[data-piece='d']"), { y: -34 });
    if (photos) {
      gsap.set(photos, { opacity: 1 });
      gsap.set(photos.children, { opacity: 0, y: 4 });
    }
    // Nur transform: Die Seite ist bereits gezeichnet (LCP), sie rückt beim Heben des Vorhangs lediglich nach.
    gsap.set(page, { y: 48 });
    gsap.set(nav, { opacity: 0, y: -8 });
    root.dataset.intro = "running";

    // Ab hier steht die Startseite: Scrollen frei, Zustand „done“ (blendet den Vorhang per CSS aus, auch beim Überspringen).
    const release = () => {
      if (released.current) return;
      released.current = true;
      root.dataset.intro = "done";
      root.style.overflow = overflow;
      lenis.current?.start();
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    const finish = () => {
      release();
      gsap.set([logo, curtain, ...page], { clearProps: "transform" });
      gsap.set(nav, { clearProps: "opacity,transform" });
      if (photos) gsap.set(photos, { opacity: 0 });
    };

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(mask, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, 0.1);
    LOGO_LETTER_DELAYS.forEach((at, letter) => {
      tl.to(svg.querySelectorAll(`[data-letter='${letter}']`), { y: 0, duration: 0.95, ease: "expo.out" }, at);
    });
    if (photos) {
      tl.to(photos.children, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 1.25);
      tl.to(photos.children, { opacity: 0, duration: 0.25, stagger: 0.02 }, HANDOVER);
    }
    tl.to(logo, { x: 0, y: 0, scale: 1, duration: 1.05, ease: "expo.inOut" }, HANDOVER)
      .to(curtain, { yPercent: -100, duration: 0.95, ease: "expo.inOut" }, HANDOVER + 0.15)
      .to(page, { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, HANDOVER + 0.35)
      .to(nav, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.04 }, HANDOVER + 0.7)
      .call(release, undefined, HANDOVER + 1.05);

    const skip = () => tl.progress(1);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      tl.kill();
      finish();
    };
  }, []);

  return null;
}
