export type Box = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };

/** Transform (Ursprung = Mitte der Box), mit dem eine Box den Bildschirm füllt (Kapitel „Licht aus“). */
export function coverTransform(box: Box, viewport: Size): { x: number; y: number; scale: number } {
  return {
    x: viewport.width / 2 - (box.left + box.width / 2),
    y: viewport.height / 2 - (box.top + box.height / 2),
    scale: Math.max(viewport.width / box.width, viewport.height / box.height),
  };
}

/** Startlage des Kopf-Logos im Intro (Ursprung oben links): halbe Breite (max. 760 px), mittig auf 36 % Höhe. */
export function introStart(logo: Box, viewport: Size): { x: number; y: number; scale: number } {
  const width = Math.min(viewport.width * 0.5, 760);
  const scale = width / logo.width;
  return { x: (viewport.width - width) / 2 - logo.left, y: viewport.height * 0.36 - (logo.height * scale) / 2 - logo.top, scale };
}

/** Strichversatz eines Fortschrittsrings: 0 = leer, 1 = geschlossen. */
export function ringOffset(progress: number, circumference: number): number {
  return circumference * (1 - Math.min(1, Math.max(0, progress)));
}

/** Parallaxe-Weg in px: Tempo × Bildschirmhöhe, auf dem Handy halbiert (Spec §6.5). */
export function parallaxDistance(speed: number, viewportHeight: number, mobile: boolean): number {
  return speed * viewportHeight * (mobile ? 0.5 : 1);
}
