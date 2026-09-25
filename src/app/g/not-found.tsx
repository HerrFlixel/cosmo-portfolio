import Link from "next/link";

/** Unbekannte oder nicht veröffentlichte Galerie: dieselbe 404 wie außerhalb der Sprachen (eigenes Root-Layout). */
export default function GalleryNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p>404 · Seite nicht gefunden / Page not found</p>
        <p className="mt-6 text-sm">
          <Link href="/" className="underline">cosmo-photos.de</Link>
        </p>
      </div>
    </main>
  );
}
