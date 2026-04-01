"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";

interface MobileMenuProps {
  open: boolean;
  links: { href: string; label: string }[];
  onClose: () => void;
}

export default function MobileMenu({ open, links, onClose }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white pt-20 md:hidden">
      <nav className="flex flex-col items-center gap-8 pt-12">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="font-heading text-3xl tracking-wider text-primary hover:text-secondary transition-colors"
          >
            {link.label.toUpperCase()}
          </Link>
        ))}
        <div className="mt-4">
          <LanguageToggle />
        </div>
      </nav>
    </div>
  );
}
