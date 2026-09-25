import type { GalleryEvent, GalleryImage } from "@/lib/galleries/repo";

const LABELS: Record<GalleryEvent["type"], string> = {
  view: "Galerie geöffnet",
  download_image: "Bild geladen",
  download_zip: "ZIP geladen",
  favorite_add: "Favorit gesetzt",
  favorite_remove: "Favorit entfernt",
};

const time = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

/** Zeitleiste der letzten 200 Ereignisse (Spec §7.3, ohne IP-Adressen). */
export function EventsPanel({ events, images }: { events: GalleryEvent[]; images: GalleryImage[] }) {
  if (events.length === 0) {
    return (
      <p data-testid="events-panel" className="text-sm text-stone">
        Noch keine Aktivität.
      </p>
    );
  }
  const names = new Map(images.map((image) => [image.id, image.filename]));
  return (
    <ul data-testid="events-panel" className="max-w-2xl space-y-1 text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex gap-4">
          <span className="w-32 shrink-0 font-label text-xs text-stone">{time(event.createdAt)}</span>
          <span>
            {LABELS[event.type]}
            {event.imageId && names.has(event.imageId) ? ` · ${names.get(event.imageId)}` : ""}
            {event.zipPart ? ` · Teil ${event.zipPart}` : ""}
            {event.visitorName ? ` · ${event.visitorName}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
