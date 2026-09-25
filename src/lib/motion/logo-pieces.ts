/**
 * Zuordnung der Wortmarken-Pfade (brand/logo-wordmark.svg, gleiche Reihenfolge wie WORDMARK.paths) für das Intro
 * „Orbit“ (Spec §5.1/5.2): "u" = oberhalb, "d" = unterhalb der Ring-Mittellinie; Zahl = Buchstabe C O S M O (0–4).
 * Übernommen aus der Referenz .superpowers/brainstorm/…/logo-intro.html. Pfad 14 ist der Ring.
 */
export const LOGO_PIECES = [
  ["u", 0], ["d", 0], ["u", 0],
  ["u", 1], ["d", 1],
  ["u", 2], ["d", 2],
  ["u", 3], ["d", 3], ["d", 3], ["d", 3], ["u", 3],
  ["u", 4], ["d", 4],
] as const satisfies readonly (readonly ["u" | "d", number])[];

export const LOGO_RING_INDEX = 14;

// Ring-Mittellinie: Grenze, aus der die Buchstaben wachsen.
const LINE = "20,50 50,49.7 80,49.2 110,47.9 140,44.9 170,41 200,35.3 220,31";
export const LOGO_UPPER_CLIP = `-6,0 226,0 226,30 ${LINE.split(" ").reverse().join(" ")} -6,50.3`;
export const LOGO_LOWER_CLIP = `-6,50.3 ${LINE} 226,30 226,90 -6,90`;

/** Strich entlang des Rings (Maske): Über stroke-dashoffset „zieht der Ring seine Bahn“. */
export const LOGO_RING_MASK = "M15,40 C4,43 1,47 10,49 C40,51.5 90,49.5 140,45 C175,41.5 205,36 211,32 C214,29 208,26 201,25";

/** Start der Buchstaben C, O, S, M, O in Sekunden (Spec §5.2). */
export const LOGO_LETTER_DELAYS = [0.5, 0.63, 0.73, 0.83, 0.97] as const;
