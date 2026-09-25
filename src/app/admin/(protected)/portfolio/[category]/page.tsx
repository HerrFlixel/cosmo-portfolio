import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABELS_DE, isCategory } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { listByCategory } from "@/lib/portfolio/repo";
import { PortfolioManager } from "./portfolio-manager";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  return { title: isCategory(category) ? CATEGORY_LABELS_DE[category] : "Portfolio" };
}

export default async function AdminPortfolioPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const images = await listByCategory(getDb(), category);
  return (
    <div>
      <p className="font-label text-xs text-stone">Portfolio</p>
      <h1 className="font-sport mt-2 text-7xl">{CATEGORY_LABELS_DE[category]}</h1>
      <p className="mt-4 max-w-xl text-sm text-stone">
        Reihenfolge per Ziehen oder mit „Nach vorne/hinten“. Rollen: ein Kapitel-Bild und bis zu 5 Kapitel-Vorschaubilder pro Kategorie,
        insgesamt 3 Hero-Bilder.
      </p>
      <div className="mt-10">
        <PortfolioManager category={category} initialImages={images} />
      </div>
    </div>
  );
}
