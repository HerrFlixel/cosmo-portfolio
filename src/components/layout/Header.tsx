"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import CosmoLogo from "./CosmoLogo";
import LanguageToggle from "./LanguageToggle";
import MobileMenu from "./MobileMenu";

const NAV = [
  { href: "/" as const, key: "projects" as const },
  { href: "/about" as const, key: "about" as const },
  { href: "/contact" as const, key: "contact" as const },
  { href: "/downloads" as const, key: "downloads" as const },
];

export default function Header({ statusText }: { statusText: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-paper/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 md:px-10 h-[72px]">
          <Link href="/" aria-label="Startseite" className="text-ink">
            <CosmoLogo className="h-7 w-auto" />
          </Link>

          <span className="hidden lg:block text-sm text-ink">{statusText}</span>

          <nav className="hidden md:flex items-center gap-10">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`text-sm tracking-nav transition-colors ${
                    active ? "text-ink" : "text-fog hover:text-ink"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
            <LanguageToggle />
          </nav>

          <button
            type="button"
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menü"
            aria-expanded={open}
          >
            <span className={`w-6 h-px bg-ink transition-transform ${open ? "rotate-45 translate-y-[3.5px]" : ""}`} />
            <span className={`w-6 h-px bg-ink transition-transform ${open ? "-rotate-45 -translate-y-[3.5px]" : ""}`} />
          </button>
        </div>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
