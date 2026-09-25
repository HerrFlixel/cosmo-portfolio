"use client";

import { useRef, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "./gsap";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Cursor (Spec §6.4, nur Desktop mit Bewegung): Punkt, über Links etwas größer, über Bildern ein Orbit-Ring wie im Logo. */
export function Cursor() {
  const fine = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = dot.current;
      if (!fine || !element) return;
      const root = document.documentElement;
      const toX = gsap.quickTo(element, "x", { duration: 0.35, ease: "power3" });
      const toY = gsap.quickTo(element, "y", { duration: 0.35, ease: "power3" });
      // Der System-Cursor verschwindet erst, wenn der Punkt da ist (sonst gäbe es bis zur ersten Bewegung gar keinen).
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        // Beim Erscheinen direkt an der Maus statt aus der Ecke oben links heranzufliegen.
        const appearing = !("visible" in element.dataset);
        toX(event.clientX, appearing ? event.clientX : undefined);
        toY(event.clientY, appearing ? event.clientY : undefined);
        element.dataset.visible = "";
        root.classList.add("has-cursor");
      };
      const over = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        element.dataset.state = !target
          ? "default"
          : target.closest("input, textarea, select")
            ? "text"
            : target.closest(".passepartout")
              ? "image"
              : target.closest("a, button, label, [role='button']")
                ? "link"
                : "default";
      };
      const leave = () => {
        delete element.dataset.visible;
        root.classList.remove("has-cursor");
      };
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerover", over);
      root.addEventListener("pointerleave", leave);
      return () => {
        window.removeEventListener("pointermove", move);
        document.removeEventListener("pointerover", over);
        root.removeEventListener("pointerleave", leave);
        root.classList.remove("has-cursor");
      };
    },
    { dependencies: [fine], revertOnUpdate: true },
  );

  if (!fine) return null;
  return <div ref={dot} aria-hidden="true" data-cursor="" data-state="default" className="cursor" />;
}
