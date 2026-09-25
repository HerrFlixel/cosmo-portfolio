"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { mediaUrl } from "@/lib/media/keys";
import type { PortfolioImage, PortfolioRole } from "@/lib/portfolio/repo";
import type { CardPatch } from "./portfolio-api";

const ROLE_OPTIONS: { value: "" | PortfolioRole; label: string }[] = [
  { value: "", label: "Keine" },
  { value: "hero", label: "Hero" },
  { value: "chapter", label: "Kapitel-Bild" },
  { value: "chapter_preview", label: "Kapitel-Vorschau" },
];
const field = "mt-1 block w-full border border-ink/20 bg-paper px-2 py-1";

type Props = {
  image: PortfolioImage;
  position: number;
  total: number;
  onPatch: (patch: CardPatch) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};

export function ImageCard({ image, position, total, onPatch, onMove, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  const saveAlt = (key: "altDe" | "altEn", value: string) => {
    if (value !== (image[key] ?? "")) onPatch({ [key]: value || null });
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="portfolio-image"
      data-id={image.id}
      data-width={image.width}
      data-height={image.height}
      className={`bg-mat p-3 ${isDragging ? "z-10 shadow-lg" : ""} ${image.visible ? "" : "opacity-60"}`}
    >
      <button type="button" aria-label={`Bild ${position + 1} verschieben`} className="block w-full cursor-grab touch-none" {...attributes} {...listeners}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Bilder kommen fertig skaliert aus R2 */}
        <img
          src={mediaUrl("portfolio", image.id, 800)}
          alt={image.altDe ?? ""}
          width={image.width}
          height={image.height}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover"
          style={{ backgroundColor: image.color }}
        />
      </button>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={image.visible} onChange={(event) => onPatch({ visible: event.target.checked })} />
          Sichtbar
        </label>
        <label className="block">
          Rolle
          <select className={field} value={image.role ?? ""} onChange={(event) => onPatch({ role: (event.target.value || null) as PortfolioRole | null })}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Alt-Text DE
          <input className={field} defaultValue={image.altDe ?? ""} onBlur={(event) => saveAlt("altDe", event.target.value)} />
        </label>
        <label className="block">
          Alt-Text EN
          <input className={field} defaultValue={image.altEn ?? ""} onBlur={(event) => saveAlt("altEn", event.target.value)} />
        </label>
        <div className="flex gap-3 pt-1">
          <button type="button" className="underline disabled:opacity-30" disabled={position === 0} onClick={() => onMove(-1)}>
            Nach vorne
          </button>
          <button type="button" className="underline disabled:opacity-30" disabled={position === total - 1} onClick={() => onMove(1)}>
            Nach hinten
          </button>
          <button type="button" className="ml-auto text-signal underline" onClick={onDelete}>
            Löschen
          </button>
        </div>
      </div>
    </li>
  );
}
