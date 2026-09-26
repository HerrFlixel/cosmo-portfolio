"use client";

import { usePathname } from "next/navigation";
import { parallaxDistance } from "@/lib/motion/geometry";
import { gsap, SplitText, useGSAP } from "./gsap";

/**
 * Bewegung an Ankern im Server-Markup, pro Seite neu aufgebaut (revertOnUpdate: beim Pfadwechsel wird alles Alte entfernt):
 * - [data-reveal="lines"]: Zeilen erscheinen hinter einer Maske, wenn sie sichtbar werden (Spec §6.4).
 *   Nur unterhalb des ersten Bildschirms.
 * - [data-speed]: Parallaxe, Weg = Tempo × Bildschirmhöhe, auf dem Handy halbiert (Spec §6.1/6.2/6.5).
 */
export function MotionEffects() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;

      for (const element of gsap.utils.toArray<HTMLElement>("[data-reveal='lines']")) {
        // „Seite zuerst“ (Plan 6): Was im ersten Bildschirm der Seite steht, ist sofort da (LCP). Zeilen-Reveals nur für
        // Inhalte, die beim Scrollen hereinkommen; gemessen ab Seitenanfang, unabhängig von der aktuellen Scrollposition.
        if (element.getBoundingClientRect().top + window.scrollY < window.innerHeight) continue;
        SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "reveal-line",
          // Überschriften bekommen ein aria-label; auf <p> lesen Screenreader das nicht vor, dort bleibt der Text normal lesbar.
          aria: element.matches("h1, h2, h3, h4, h5, h6") ? "auto" : "none",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              // Weit genug unter die (gepolsterte) Maske, dass auch Umlaut-Punkte anfangs verborgen sind.
              yPercent: 130,
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.08,
              scrollTrigger: { trigger: element, start: "top 88%", once: true },
            });
          },
        });
      }

      for (const element of gsap.utils.toArray<HTMLElement>("[data-speed]")) {
        const distance = () => parallaxDistance(Number(element.dataset.speed), window.innerHeight, mobile);
        gsap.fromTo(
          element,
          { y: () => distance() / 2 },
          { y: () => -distance() / 2, ease: "none", scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } },
        );
      }
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
