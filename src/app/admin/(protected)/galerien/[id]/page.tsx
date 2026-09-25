import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, getGalleryById, listImages, revealPassword } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { isUuid } from "@/lib/media/keys";
import { STATE_LABELS } from "../labels";
import { extendGalleryAction, setStatusAction } from "./actions";
import { DeleteGalleryButton } from "./delete-button";
import { GalleryImages } from "./gallery-images";
import { GallerySettings } from "./gallery-settings";
import { MessagePanel } from "./message-panel";
import { PasswordPanel } from "./password-panel";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Galerie" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-ink/10 pt-8">
      <h2 className="font-label text-xs text-stone">{title}</h2>
      {children}
    </section>
  );
}

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const gallery = isUuid(id) ? await getGalleryById(db, id) : undefined;
  if (!gallery) notFound();
  const [images, password] = await Promise.all([
    listImages(db, gallery.id),
    // Nur nach einem Wechsel von GALLERY_SECRET nicht mehr lesbar → Hinweis statt Absturz.
    revealPassword(gallerySecret(), gallery).catch(() => null),
  ]);
  const host = (await headers()).get("host") ?? "cosmo-photos.de";
  const url = `https://${host}/g/${gallery.slug}`;

  return (
    <div className="space-y-10">
      <header>
        <p className="font-label text-xs text-stone">Galerie</p>
        <h1 className="font-display mt-2 text-5xl">{gallery.title}</h1>
        <dl className="mt-6 grid max-w-2xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-stone">Status</dt>
          <dd data-testid="gallery-status">{STATE_LABELS[galleryState(gallery, new Date())]}</dd>
          <dt className="text-stone">Link</dt>
          <dd data-testid="gallery-link" className="font-label">{url}</dd>
          <dt className="text-stone">Online bis</dt>
          <dd data-testid="gallery-expiry">{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <form action={setStatusAction.bind(null, gallery.id, gallery.status === "draft" ? "online" : "draft")}>
            <button type="submit" className="bg-ink px-6 py-2 text-paper">
              {gallery.status === "draft" ? "Veröffentlichen" : "Zurück auf Entwurf"}
            </button>
          </form>
          <form action={extendGalleryAction.bind(null, gallery.id)}>
            <button type="submit" className="border border-ink px-4 py-2">
              Um 30 Tage verlängern
            </button>
          </form>
        </div>
      </header>

      <Section title="Bilder">
        <GalleryImages galleryId={gallery.id} coverImageId={gallery.coverImageId} initialImages={images} />
      </Section>

      {password && (
        <Section title="Nachricht an den Kunden">
          <MessagePanel url={url} password={password} expiresAt={gallery.expiresAt} />
        </Section>
      )}

      <Section title="Passwort">
        <PasswordPanel galleryId={gallery.id} password={password} />
      </Section>

      <Section title="Einstellungen">
        <GallerySettings gallery={gallery} />
      </Section>

      <Section title="Löschen">
        <DeleteGalleryButton galleryId={gallery.id} />
      </Section>
    </div>
  );
}
