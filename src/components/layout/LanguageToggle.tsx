"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const other = locale === "de" ? "en" : "de";

  return (
    <button
      onClick={() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace({ pathname, params } as any, { locale: other })
      }
      className="font-mono text-xs text-fog hover:text-ink transition-colors"
      aria-label="Sprache wechseln"
    >
      {other.toUpperCase()}
    </button>
  );
}
