"use client";

import { useState } from "react";
import type { VisitorFavorites } from "@/lib/galleries/repo";

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, "");

/** Pro Person die Auswahl; die Dateinamen passen kommagetrennt in Lightrooms Textfilter (Spec §8). */
export function FavoritesPanel({ galleryId, visitors }: { galleryId: string; visitors: VisitorFavorites[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (visitors.length === 0) {
    return (
      <p data-testid="favorites-panel" className="text-sm text-stone">
        Noch keine Favoriten.
      </p>
    );
  }
  return (
    <div data-testid="favorites-panel" className="space-y-8">
      {visitors.map((visitor) => {
        const names = visitor.images.map((image) => baseName(image.filename)).join(", ");
        return (
          <div key={visitor.visitorName} className="space-y-3">
            <p className="text-sm">
              <strong>{visitor.visitorName}</strong> · {visitor.images.length} Favoriten
            </p>
            <ul className="flex flex-wrap gap-2">
              {visitor.images.map((image) => (
                <li key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau aus dem privaten Bucket */}
                  <img src={`/admin/api/galleries/${galleryId}/images/${image.id}/thumb`} alt={image.filename} loading="lazy" className="h-20 w-20 object-cover" />
                </li>
              ))}
            </ul>
            <label className="block text-sm">
              Dateinamen für Lightroom
              <textarea readOnly rows={2} value={names} className="mt-1 block w-full max-w-2xl border border-ink/20 bg-paper px-3 py-2 font-label text-xs" />
            </label>
            <button
              type="button"
              className="text-sm underline"
              onClick={async () => {
                await navigator.clipboard.writeText(names);
                setCopied(visitor.visitorName);
              }}
            >
              Dateinamen kopieren
            </button>
            {copied === visitor.visitorName && (
              <span role="status" className="ml-3 text-sm">
                Kopiert.
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
