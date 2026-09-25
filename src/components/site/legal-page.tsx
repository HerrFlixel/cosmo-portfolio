import { getTranslations } from "next-intl/server";
import { TextBlocks } from "./text-blocks";

/** Impressum und Datenschutz (Spec §6.3): schlichte Textseite, Inhalt aus dem Admin. */
export async function LegalPage({ titleKey, text }: { titleKey: "imprint" | "privacy"; text: string }) {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">{t(`pages.${titleKey}`)}</h1>
        <div className="mt-12 space-y-5 leading-relaxed">
          {text.trim() ? <TextBlocks text={text} /> : <p className="text-stone">{t("legal.pending")}</p>}
        </div>
      </div>
    </main>
  );
}
