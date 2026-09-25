"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ringOffset } from "@/lib/motion/geometry";
import { ScrollTrigger, useGSAP } from "./gsap";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Scroll-Fortschritt (Spec §6.4): winziger Ring unten rechts, der sich schließt; Differenz-Mischung für Hell und Dunkel. */
export function ScrollProgress() {
  const circle = useRef<SVGCircleElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const element = circle.current;
      if (!element) return;
      const update = (progress: number) => {
        element.style.strokeDashoffset = String(ringOffset(progress, CIRCUMFERENCE));
      };
      const trigger = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => update(self.progress) });
      update(trigger.progress);
    },
    { dependencies: [pathname] },
  );

  return (
    <svg aria-hidden="true" data-scroll-progress viewBox="0 0 40 40" className="pointer-events-none fixed bottom-5 right-5 z-[25] size-9 -rotate-90 text-white mix-blend-difference">
      <circle cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle ref={circle} cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} />
    </svg>
  );
}
