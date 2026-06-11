"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageToggle from "./LanguageToggle";

const NAV = [
  { href: "/" as const, key: "projects" as const },
  { href: "/about" as const, key: "about" as const },
  { href: "/contact" as const, key: "contact" as const },
  { href: "/downloads" as const, key: "downloads" as const },
];

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");

  return (
    <div
      className={`fixed inset-0 z-30 bg-paper flex flex-col justify-center px-8 transition-opacity duration-300 md:hidden ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <nav className="flex flex-col gap-2">
        {NAV.map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            className="text-4xl font-medium tracking-tight text-ink py-2"
            style={{
              transition: "opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)",
              transitionDelay: `${i * 60}ms`,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(16px)",
            }}
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <div className="mt-10">
        <LanguageToggle />
      </div>
    </div>
  );
}
