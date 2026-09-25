import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, getGalleryById, revealPassword } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { isUuid } from "@/lib/media/keys";
import { STATE_LABELS } from "../labels";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  const gallery = isUuid(id) ? await getGalleryById(getDb(), id) : undefined;
  if (!gallery) notFound();
  const host = (await headers()).get("host") ?? "cosmo-photos.de";
  const password = await revealPassword(gallerySecret(), gallery);
  return (
    <div>
      <p className="font-label text-xs text-stone">Galerie</p>
      <h1 className="font-display mt-2 text-5xl">{gallery.title}</h1>
      <dl className="mt-6 grid max-w-2xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-stone">Status</dt>
        <dd data-testid="gallery-status">{STATE_LABELS[galleryState(gallery, new Date())]}</dd>
        <dt className="text-stone">Link</dt>
        <dd data-testid="gallery-link" className="font-label">{`https://${host}/g/${gallery.slug}`}</dd>
        <dt className="text-stone">Online bis</dt>
        <dd data-testid="gallery-expiry">{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</dd>
        <dt className="text-stone">Passwort</dt>
        <dd data-testid="gallery-password" className="font-label">{password}</dd>
      </dl>
    </div>
  );
}
