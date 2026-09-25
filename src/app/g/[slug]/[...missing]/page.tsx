import { notFound } from "next/navigation";

// Tiefe Pfade unter einer Galerie (/g/<slug>/x/y) enden in der Galerie-404, nie im [locale]-Baum.
export default function GalleryMissingPage() {
  notFound();
}
