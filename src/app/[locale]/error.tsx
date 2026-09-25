"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/** Fehler in einer Seite (z. B. Datenbank nicht erreichbar): gestaltet, in der Sprache der Seite, mit „Neu laden“. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="relative mx-auto grid min-h-[70dvh] max-w-[1400px] place-items-center overflow-hidden px-4">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[62%] -translate-y-[46%] rounded-full border-[1.5px] border-ink/15" />
      <div className="relative text-center">
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("title")}</h1>
        <p className="mt-5 text-muted">{t("text")}</p>
        <button type="button" onClick={reset} className="mt-10 rounded-full bg-ink px-7 py-3 text-paper transition active:scale-[0.98]">
          {t("retry")}
        </button>
      </div>
    </main>
  );
}
