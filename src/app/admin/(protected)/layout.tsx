import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid min-h-dvh md:grid-cols-[14rem_1fr]">
      <nav aria-label="Admin" className="border-b border-ink/10 p-6 md:border-b-0 md:border-r">
        <p className="font-label text-xs text-stone">Cosmo Admin</p>
        <ul className="mt-6 space-y-2 text-sm">
          <li><Link href="/admin">Übersicht</Link></li>
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link href={`/admin/portfolio/${category}`}>{CATEGORY_LABELS_DE[category]}</Link>
            </li>
          ))}
          <li><Link href="/admin/texte">Texte &amp; Links</Link></li>
          <li className="text-stone">Galerien (folgt)</li>
        </ul>
        <form action={logout} className="mt-10">
          <button type="submit" className="text-sm underline">Abmelden</button>
        </form>
      </nav>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}
