import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { countByCategory } from "@/lib/portfolio/repo";

export default async function AdminHomePage() {
  const counts = await countByCategory(getDb());
  return (
    <div>
      <h1 className="font-display text-5xl">Übersicht</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link href={`/admin/portfolio/${category}`} className="block bg-mat p-6">
              <span className="font-sport text-4xl">{CATEGORY_LABELS_DE[category]}</span>
              <span className="mt-2 block font-label text-xs text-stone">
                {counts[category].visible} sichtbar · {counts[category].total} gesamt
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
