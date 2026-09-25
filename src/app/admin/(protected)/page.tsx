import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-5xl">Übersicht</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link href={`/admin/portfolio/${category}`} className="block bg-mat p-6">
              <span className="font-sport text-4xl">{CATEGORY_LABELS_DE[category]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
