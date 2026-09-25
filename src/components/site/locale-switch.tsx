"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Wechselt die Sprache und bleibt auf derselben Seite (lokalisierter Pfad, z. B. /fussball ↔ /en/football). */
export function LocaleSwitch({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "de" ? "en" : "de";
  return (
    <Link href={pathname} locale={other} hrefLang={other} lang={other} className={className} onClick={onNavigate}>
      {t("switchLocale")}
    </Link>
  );
}
