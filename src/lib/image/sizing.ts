/** Längste Kante auf `max` begrenzen, nie vergrößern, nie 0 px. */
export function targetSize(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Durchschnittsfarbe aus RGBA-Pixeln als #rrggbb (Alpha wird ignoriert). */
export function averageColor(rgba: ArrayLike<number>): string {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return "#000000";
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    r += rgba[i];
    g += rgba[i + 1];
    b += rgba[i + 2];
  }
  const hex = (sum: number) => Math.round(sum / pixels).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
