export type TextBlock = { kind: "heading" | "paragraph"; lines: string[] };

/** Pflegetexte (Impressum, Datenschutz, Über mich): Leerzeile = Absatz, einzelne Zeile mit „#“ = Zwischenüberschrift. */
export function textBlocks(text: string): TextBlock[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): TextBlock => {
      const heading = chunk.match(/^#{1,3}\s+(.+)$/);
      if (heading && !chunk.includes("\n")) return { kind: "heading", lines: [heading[1].trim()] };
      return { kind: "paragraph", lines: chunk.split("\n").map((line) => line.trim()) };
    });
}

/** *Wort* wird kursiv (Headline-Betonung wie „Hallen, Rauch, *Gänsehaut.*“). */
export function emphasis(text: string): { text: string; italic: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => (/^\*[^*]+\*$/.test(part) ? { text: part.slice(1, -1), italic: true } : { text: part, italic: false }));
}

// Web-Adressen ohne Satzzeichen am Ende, dann E-Mail-Adressen.
const LINK = /(https?:\/\/[^\s<>()]*[^\s<>().,;:!?]|[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,})/gi;

export function linkParts(line: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: line.slice(last, index) });
    const value = match[0];
    parts.push({ text: value, href: value.startsWith("http") ? value : `mailto:${value}` });
    last = index + value.length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}
