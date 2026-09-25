import { getTranslations } from "next-intl/server";
import { TextBlocks } from "./text-blocks";

/** Impressum und Datenschutz (Spec §6.3): schlichte Textseite, Inhalt aus dem Admin. */
export async function LegalPage({ titleKey, text, fallback = false }: { titleKey: "imprint" | "privacy"; text: string; fallback?: boolean }) {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="max-w-[68ch]">
        <h1 data-reveal="lines" className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">{t(`pages.${titleKey}`)}</h1>
        {fallback && <p className="mt-8 text-sm text-muted">{t("legal.germanOnly")}</p>}
        <div className="mt-12 space-y-5 leading-relaxed" lang={fallback ? "de" : undefined}>
          {text.trim() ? <TextBlocks text={text} /> : <p className="text-muted">{t("legal.pending")}</p>}
        </div>
      </div>
    </main>
  );
}
