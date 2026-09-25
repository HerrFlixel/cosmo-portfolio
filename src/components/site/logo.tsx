import { LOGO_LOWER_CLIP, LOGO_PIECES, LOGO_RING_INDEX, LOGO_RING_MASK, LOGO_UPPER_CLIP } from "@/lib/motion/logo-pieces";
import { LOCKUP, WORDMARK } from "./logo-paths";

type Props = { className?: string; decorative?: boolean };

const label = (decorative: boolean) => (decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": "Cosmo Photos" });

/**
 * COSMO mit Ring (Kopf, Menü), aufgebaut wie im Intro „Orbit“ (Spec §5.1/5.2): obere und untere Buchstabenteile in je
 * einer Clip-Gruppe (Grenze = Ring-Mittellinie), der Ring hinter einer Strich-Maske. In Ruhe sieht es aus wie das SVG.
 * `id` muss pro Seite eindeutig sein; `withPhotos` legt PHOTOS unsichtbar darunter (nur fürs Intro).
 */
export function Wordmark({ id, className, decorative = false, withPhotos = false }: Props & { id: string; withPhotos?: boolean }) {
  const pieces = (kind: "u" | "d") =>
    LOGO_PIECES.map(([pieceKind, letter], index) =>
      pieceKind === kind ? <path key={index} d={WORDMARK.paths[index]} data-piece={pieceKind} data-letter={letter} /> : null,
    );
  return (
    <svg viewBox={WORDMARK.viewBox} className={className} fill="currentColor" overflow="visible" {...label(decorative)}>
      <defs>
        <clipPath id={`${id}-u`} clipPathUnits="userSpaceOnUse">
          <polygon points={LOGO_UPPER_CLIP} />
        </clipPath>
        <clipPath id={`${id}-d`} clipPathUnits="userSpaceOnUse">
          <polygon points={LOGO_LOWER_CLIP} />
        </clipPath>
        <mask id={`${id}-ring`} maskUnits="userSpaceOnUse" x="-10" y="10" width="240" height="60">
          <path data-ring-mask d={LOGO_RING_MASK} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
        </mask>
      </defs>
      <g clipPath={`url(#${id}-u)`}>{pieces("u")}</g>
      <g clipPath={`url(#${id}-d)`}>{pieces("d")}</g>
      <path d={WORDMARK.paths[LOGO_RING_INDEX]} mask={`url(#${id}-ring)`} data-logo-ring />
      {withPhotos && (
        <g data-logo-photos opacity="0">
          {LOCKUP.paths.slice(WORDMARK.paths.length).map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Voller Lockup mit PHOTOS (Fußzeile). `spinRing`: der Ring pendelt beim Scrollen (Spec §6.1). */
export function Lockup({ className, decorative = false, spinRing = false }: Props & { spinRing?: boolean }) {
  return (
    <svg viewBox={LOCKUP.viewBox} className={className} fill="currentColor" {...label(decorative)}>
      {LOCKUP.paths.map((d, index) => (
        <path key={index} d={d} {...(spinRing && index === LOGO_RING_INDEX ? { "data-logo-ring-spin": "" } : {})} />
      ))}
    </svg>
  );
}
