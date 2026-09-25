"use client";

import { useRef, type ReactNode } from "react";
import { coverTransform, type Box } from "@/lib/motion/geometry";
import { gsap, useGSAP } from "./gsap";
import { useMotion } from "./motion-root";

/** Lage relativ zur Bühne über offset* (unabhängig von laufenden Transforms). */
function boxWithin(element: HTMLElement, container: HTMLElement): Box {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== container) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}

/**
 * Kapitel „Einlauf“ (Spec §6.1). Mit Bewegung wird die Bühne fixiert:
 * 0–40 % Licht aus, das Kapitelbild wächst aus dem Passepartout bildfüllend;
 * 40–70 % Titel und Zähler erscheinen, der Signal-Punkt glimmt;
 * 70–100 % Licht wieder an, das Bild kehrt in sein Passepartout zurück.
 * Ohne Bewegung bleibt das statische dunkle Band aus dem Server-Markup.
 */
export function ChapterScene({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const { enabled } = useMotion();

  useGSAP(
    () => {
      const root = stage.current;
      if (!enabled || !root) return;
      const find = (selector: string) => root.querySelector<HTMLElement>(selector)!;
      const bg = find("[data-chapter-bg]");
      const frame = find("[data-chapter-frame]");
      const photoWindow = find(".passepartout-window");
      const mat = find(".passepartout-mat");
      const dim = find("[data-chapter-dim]");
      const title = find("[data-chapter-title]");
      const count = find("[data-chapter-title] p");
      const dot = find("[data-chapter-dot]");
      const mobile = window.matchMedia("(max-width: 767px)").matches;

      // Das Bildfenster (nicht der Rand) soll den Bildschirm füllen: Ursprung = Mitte des Fensters im Rahmen.
      const cover = () => coverTransform(boxWithin(photoWindow, root), { width: root.clientWidth, height: window.innerHeight });
      const origin = () => {
        const inner = boxWithin(photoWindow, root);
        const outer = boxWithin(frame, root);
        return `${inner.left - outer.left + inner.width / 2}px ${inner.top - outer.top + inner.height / 2}px`;
      };

      gsap.set(frame, { transformOrigin: origin() });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: mobile ? "+=110%" : "+=180%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => gsap.set(frame, { transformOrigin: origin() }),
        },
      });
      tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0)
        .fromTo(frame, { x: 0, y: 0, scale: 1 }, { x: () => cover().x, y: () => cover().y, scale: () => cover().scale, duration: 0.4, ease: "power2.inOut" }, 0)
        .fromTo(mat, { backgroundColor: "rgba(255, 255, 255, 1)" }, { backgroundColor: "rgba(255, 255, 255, 0)", duration: 0.2 }, 0.2)
        .set(mat, { boxShadow: "none" }, 0.3)
        .fromTo(dim, { opacity: 0 }, { opacity: 0.45, duration: 0.15 }, 0.4)
        // Titel und Zähler einzeln: Transform oder Deckkraft am Titelblock würden die Differenz-Mischung des Titels isolieren.
        .fromTo(title.children, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.2, ease: "expo.out" }, 0.42)
        .fromTo(dot, { boxShadow: "0 0 0 0 rgba(255, 61, 46, 0)" }, { boxShadow: "0 0 16px 5px rgba(255, 61, 46, 0.75)", duration: 0.12 }, 0.5)
        .to(dim, { opacity: 0, duration: 0.15 }, 0.7)
        .to(bg, { opacity: 0, duration: 0.3 }, 0.7)
        .to(frame, { x: 0, y: 0, scale: 1, duration: 0.3, ease: "power2.inOut" }, 0.7)
        .to(count, { color: "#141414", duration: 0.3 }, 0.7)
        .to(dot, { boxShadow: "0 0 0 0 rgba(255, 61, 46, 0)", duration: 0.15 }, 0.85)
        .to(mat, { backgroundColor: "rgba(255, 255, 255, 1)", duration: 0.2 }, 0.8)
        .set(mat, { clearProps: "boxShadow" }, 0.95);
    },
    { dependencies: [enabled], scope: stage, revertOnUpdate: true },
  );

  // Papiergrund: Die fixierte Bühne ist eine eigene Mischgruppe; ohne deckenden Grund mischte der Titel (Differenz) gegen „transparent“.
  return (
    <div ref={stage} data-chapter-stage className="relative flex min-h-[100svh] items-center overflow-hidden bg-paper text-hall-ink">
      {children}
    </div>
  );
}
