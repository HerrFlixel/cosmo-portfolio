"use client";

import { useRef, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "./gsap";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Blende: sechs Lamellen im Ring (Radius R). Die Öffnung ist der Innenradius des Sechsecks in der Mitte.
const R = 10;
const BLADES = 6;
const OPEN = 5.5;
const STOPPED_DOWN = 3;
const SHUTTER = 0.4;
const MASK = "cursor-aperture";

type State = "default" | "link" | "image" | "text";
const OPENING: Record<State, number> = { default: OPEN, link: STOPPED_DOWN, image: STOPPED_DOWN, text: OPEN };

/** Lamelle i: vom Drehpunkt am Ring bis zur Ecke des Sechsecks; ihre Kante liegt im Abstand `opening` zur Mitte. */
function blade(index: number, opening: number) {
  const theta = (index * 2 * Math.PI) / BLADES;
  const alpha = Math.acos(Math.min(opening / R, 1));
  const phi = theta + Math.PI / 2 + alpha;
  const length = R * Math.sin(alpha) + opening * Math.tan(Math.PI / BLADES);
  const x1 = R * Math.cos(theta);
  const y1 = R * Math.sin(theta);
  return { x1, y1, x2: x1 + length * Math.cos(phi), y2: y1 + length * Math.sin(phi) };
}

/** Die Lamellen sind gefüllt: Kreis minus Sechseck (die Enden der Kanten), getrennt durch schmale Spalte entlang der Kanten. */
function drawBlades(opening: SVGPolygonElement, gaps: SVGLineElement[], size: number) {
  const corners: string[] = [];
  gaps.forEach((line, index) => {
    const points = blade(index, size);
    for (const [name, value] of Object.entries(points)) line.setAttribute(name, value.toFixed(3));
    corners.push(`${points.x2.toFixed(3)},${points.y2.toFixed(3)}`);
  });
  opening.setAttribute("points", corners.join(" "));
}

/** Cursor (Spec §6.4, nur Desktop mit Bewegung): kleine Blende. Über Klickbarem blendet sie ab, beim Klick löst sie aus; die Größe bleibt. */
export function Cursor() {
  const fine = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const cursor = useRef<HTMLDivElement>(null);
  const blades = useRef<SVGGElement>(null);

  useGSAP(
    () => {
      const element = cursor.current;
      const group = blades.current;
      if (!fine || !element || !group) return;
      const root = document.documentElement;
      const opening = group.querySelector("polygon");
      const gaps = Array.from(group.querySelectorAll("line"));
      if (!opening) return;
      const aperture = { opening: OPEN };
      const draw = () => drawBlades(opening, gaps, aperture.opening);
      const target = () => OPENING[(element.dataset.state as State | undefined) ?? "default"];
      draw();

      const toX = gsap.quickTo(element, "x", { duration: 0.35, ease: "power3" });
      const toY = gsap.quickTo(element, "y", { duration: 0.35, ease: "power3" });
      // Der System-Cursor verschwindet erst, wenn die Blende da ist (sonst gäbe es bis zur ersten Bewegung gar keinen).
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
        const hit = event.target instanceof Element ? event.target : null;
        const state: State = !hit
          ? "default"
          : hit.closest("input, textarea, select")
            ? "text"
            : hit.closest(".passepartout")
              ? "image"
              : hit.closest("a, button, label, [role='button']")
                ? "link"
                : "default";
        if (element.dataset.state === state) return;
        element.dataset.state = state;
        gsap.to(aperture, { opening: target(), duration: 0.45, ease: "expo.out", overwrite: true, onUpdate: draw });
      };
      // Auslösen: kurz fast ganz zu, dann zurück auf die Blende des aktuellen Zustands.
      const press = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        gsap.killTweensOf(aperture);
        gsap
          .timeline({ onUpdate: draw })
          .to(aperture, { opening: SHUTTER, duration: 0.08, ease: "power2.in" })
          .to(aperture, { opening: target, duration: 0.4, ease: "expo.out" });
      };
      const leave = () => {
        delete element.dataset.visible;
        root.classList.remove("has-cursor");
      };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", press, { passive: true });
      document.addEventListener("pointerover", over);
      root.addEventListener("pointerleave", leave);
      return () => {
        gsap.killTweensOf(aperture);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", press);
        document.removeEventListener("pointerover", over);
        root.removeEventListener("pointerleave", leave);
        root.classList.remove("has-cursor");
      };
    },
    { dependencies: [fine], revertOnUpdate: true },
  );

  if (!fine) return null;
  return (
    <div ref={cursor} aria-hidden="true" data-cursor="" data-state="default" className="cursor">
      <svg viewBox="-11 -11 22 22">
        <mask id={MASK}>
          <circle r={R} fill="#fff" />
          <g ref={blades} fill="#000" stroke="#000" strokeWidth="0.9" strokeLinecap="round">
            <polygon />
            {Array.from({ length: BLADES }, (_, index) => (
              <line key={index} />
            ))}
          </g>
        </mask>
        <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="#fff" mask={`url(#${MASK})`} />
      </svg>
    </div>
  );
}
