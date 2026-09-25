import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, listGalleries } from "@/lib/galleries/repo";
import { STATE_LABELS } from "./labels";
import { NewGalleryForm } from "./new-gallery-form";

export const metadata: Metadata = { title: "Galerien" };

export default async function GalleriesPage() {
  const galleries = await listGalleries(getDb());
  const now = new Date();
  return (
    <div>
      <h1 className="font-display text-5xl">Galerien</h1>
      <div className="mt-8">
        <NewGalleryForm />
      </div>
      {galleries.length === 0 ? (
        <p className="mt-10 text-stone">Noch keine Galerien.</p>
      ) : (
        <table className="mt-10 w-full text-left text-sm">
          <thead className="font-label text-xs text-stone">
            <tr>
              <th className="py-2">Titel</th>
              <th>Status</th>
              <th>Bilder</th>
              <th>Aufrufe</th>
              <th>Downloads</th>
              <th>Favoriten</th>
              <th>Online bis</th>
            </tr>
          </thead>
          <tbody>
            {galleries.map((gallery) => (
              <tr key={gallery.id} className="border-t border-ink/10">
                <td className="py-3">
                  <Link href={`/admin/galerien/${gallery.id}`} className="underline">
                    {gallery.title}
                  </Link>
                </td>
                <td>{STATE_LABELS[galleryState(gallery, now)]}</td>
                <td>{gallery.imageCount} Bilder</td>
                <td>{gallery.views}</td>
                <td>{gallery.downloads}</td>
                <td>{gallery.favorites}</td>
                <td>{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
