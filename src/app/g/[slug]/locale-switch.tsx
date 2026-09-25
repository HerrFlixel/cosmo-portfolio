"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

/** Gleiches Cookie wie die öffentliche Seite: Die gewählte Sprache gilt dort auch. */
export function LocaleSwitch() {
  const t = useTranslations("gallery");
  const locale = useLocale();
  const router = useRouter();
  return (
    <button
      type="button"
      className="font-label text-xs text-stone underline"
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${locale === "de" ? "en" : "de"}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }}
    >
      {t("switchLocale")}
    </button>
  );
}
