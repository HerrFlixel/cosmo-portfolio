"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/images", label: "Bilder" },
  { href: "/admin/downloads", label: "Downloads" },
  { href: "/admin/settings", label: "Einstellungen" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-primary text-white p-6 flex flex-col">
      <Link href="/admin" className="font-heading text-xl tracking-wider mb-8 block">
        COSMO ADMIN
      </Link>

      <nav className="flex flex-col gap-2 flex-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-sm tracking-nav uppercase transition-colors ${
                active ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="px-4 py-2 text-sm tracking-nav uppercase text-white/40 hover:text-white transition-colors text-left"
      >
        Abmelden
      </button>
    </aside>
  );
}
