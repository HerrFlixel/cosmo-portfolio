"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, type Locale } from "@/lib/format";
import { VISITOR_COOKIE } from "@/lib/galleries/token";
import { DownloadButtons } from "./download-buttons";
import { Lightbox } from "./lightbox";
import { LocaleSwitch } from "./locale-switch";
import { NameDialog } from "./name-dialog";
import type { ViewImage } from "./types";

type Props = {
  slug: string;
  title: string;
  shootDate: string | null;
  expiresAt: string | null;
  coverId: string | null;
  images: ViewImage[];
  initialFavorites: string[];
  initialVisitor: string | null;
};

/** Höchstens 40 Zeichen wie normalizeVisitorName, ohne ein Emoji zu zerschneiden. */
const clampName = (raw: string) => [...raw.trim()].slice(0, 40).join("");

export function GalleryView({ slug, title, shootDate, expiresAt, coverId, images, initialFavorites, initialVisitor }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
  const [visitor, setVisitor] = useState(initialVisitor);
  // Bild, das nach der Namensabfrage markiert wird (null = Dialog zu).
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const close = useCallback(() => setOpen(null), []);

  const favoriteImages = images.filter((image) => favorites.has(image.id));
  const filtering = onlyFavorites && favoriteImages.length > 0;
  const visible = filtering ? favoriteImages : images;
  const current = open !== null && visible.length > 0 ? Math.min(open, visible.length - 1) : null;
  const meta = [
    shootDate ? formatDate(shootDate, locale) : null,
    t("images", { count: images.length }),
    expiresAt ? t("onlineUntil", { date: formatDate(expiresAt, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function flip(id: string, add: boolean) {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (add) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Sofort anzeigen, bei Fehler zurücknehmen. */
  function save(id: string, name: string, add: boolean) {
    flip(id, add);
    fetch(`/g/${slug}/api/favorites`, {
      method: add ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId: id, name }),
    })
      .then((response) => {
        if (!response.ok) flip(id, !add);
      })
      .catch(() => flip(id, !add));
  }

  function toggleFavorite(id: string) {
    if (!visitor) {
      setPendingFavorite(id);
      return;
    }
    save(id, visitor, !favorites.has(id));
  }

  async function chooseName(raw: string) {
    const name = clampName(raw);
    const id = pendingFavorite;
    setPendingFavorite(null);
    if (!name) return;
    document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(name)}; Path=/g/${slug}; Max-Age=31536000; SameSite=Lax; Secure`;
    setVisitor(name);
    // Wer unter diesem Namen schon markiert hat (z. B. am Handy), bekommt seine Auswahl zurück.
    const response = await fetch(`/g/${slug}/api/favorites?name=${encodeURIComponent(name)}`);
    const existing = response.ok ? ((await response.json()) as string[]) : [];
    setFavorites(new Set(existing));
    if (id && !existing.includes(id)) save(id, name, true);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker
        <img src={`/g/${slug}/img/${coverId}/preview`} alt="" className="mb-10 aspect-[21/9] w-full object-cover" />
      )}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-label text-xs text-stone">Cosmo Photos</p>
          <h1 className="font-display mt-2 text-5xl">{title}</h1>
          <p className="mt-3 font-label text-xs text-stone">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-3 text-sm">
          <LocaleSwitch />
          <DownloadButtons slug={slug} set="all" images={images} primary />
        </div>
      </header>

      {favoriteImages.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6 text-sm">
          <button type="button" onClick={() => setOnlyFavorites((value) => !value)} aria-pressed={filtering} className="underline">
            {filtering ? t("showAll") : t("onlyFavorites")}
          </button>
          <DownloadButtons slug={slug} set="favorites" images={favoriteImages} primary={false} />
        </div>
      )}

      {images.length === 0 ? (
        <p className="mt-16 text-stone">{t("empty")}</p>
      ) : (
        <ul data-testid="gallery-grid" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((image, index) => {
            const active = favorites.has(image.id);
            return (
              // content-visibility: Der Browser zeichnet nur sichtbare Kacheln (Spec §7.1, große Galerien).
              <li key={image.id} className="relative [contain-intrinsic-size:auto_320px] [content-visibility:auto]">
                <button type="button" data-testid="gallery-thumb" onClick={() => setOpen(index)} className="block w-full bg-mat p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
                  <img
                    src={`/g/${slug}/img/${image.id}/thumb`}
                    alt={image.filename}
                    loading="lazy"
                    width={image.width}
                    height={image.height}
                    className="aspect-[4/5] w-full object-cover"
                    style={{ backgroundColor: image.color }}
                  />
                </button>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={active ? t("unfavorite") : t("favorite")}
                  onClick={() => toggleFavorite(image.id)}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/40 text-lg text-paper backdrop-blur-sm"
                >
                  {active ? "♥" : "♡"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {current !== null && (
        <Lightbox
          slug={slug}
          images={visible}
          index={current}
          onIndex={setOpen}
          onClose={close}
          favorite={{ active: favorites.has(visible[current].id), onToggle: () => toggleFavorite(visible[current].id) }}
        />
      )}

      {pendingFavorite !== null && <NameDialog onSubmit={(name) => void chooseName(name)} onCancel={() => setPendingFavorite(null)} />}
    </main>
  );
}
