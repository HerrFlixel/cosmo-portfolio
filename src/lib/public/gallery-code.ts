import { slugify } from "@/lib/galleries/slug";

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Eingabe im Feld „Galerie-Code“: Kurzname, getippter Titel oder der ganze Link aus der Nachricht. */
export function galleryCodeToSlug(input: string): string | null {
  const trimmed = input.trim();
  const fromLink = trimmed.match(/\/g\/([^/?#\s]+)/);
  if (!fromLink && trimmed.includes("/g/")) return null;
  const source = fromLink ? decode(fromLink[1]) : trimmed;
  return /[a-z0-9äöüß]/i.test(source) ? slugify(source) : null;
}
