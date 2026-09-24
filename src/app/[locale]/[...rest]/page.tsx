import { notFound } from "next/navigation";

// Keine gültigen tiefen Pfade: alles hier ist 404 (global-not-found statt ungestylter Next-404).
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function CatchAllPage() {
  notFound();
}
