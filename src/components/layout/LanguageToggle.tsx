"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const newLocale = locale === "de" ? "en" : "de";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={switchLocale}
      className="font-body text-xs tracking-nav uppercase text-muted hover:text-primary transition-colors"
    >
      <span className={locale === "de" ? "text-primary font-semibold" : ""}>DE</span>
      <span className="mx-1">|</span>
      <span className={locale === "en" ? "text-primary font-semibold" : ""}>EN</span>
    </button>
  );
}
