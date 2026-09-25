import { Fragment } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortraitFrame } from "@/components/site/passepartout";
import { TextBlocks } from "@/components/site/text-blocks";
import { Link } from "@/i18n/navigation";
import { loadSettings } from "@/lib/public/data";
import { emphasis } from "@/lib/public/text";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("about") };
}

/** Über mich (Spec §6.3): Porträt im Passepartout, Bodoni-Statement, Text, Referenzen als Liste. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations(), loadSettings()]);
  const statement = (locale === "de" ? settings.about_statement_de : settings.about_statement_en) || t("about.statementFallback");
  const text = locale === "de" ? settings.about_text_de : settings.about_text_en;
  const references = settings.references.split("\n").map((line) => line.trim()).filter(Boolean);
  const portrait = settings.about_portrait_id;

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        {portrait && (
          <div className="md:col-span-5 lg:col-span-4">
            <div className="md:sticky md:top-10">
              <PortraitFrame id={portrait} alt={t("home.portraitAlt")} />
            </div>
          </div>
        )}
        <div className={portrait ? "md:col-span-7 lg:col-span-7 lg:col-start-6" : "md:col-span-10 md:col-start-2"}>
          <h1 className="font-label text-xs uppercase tracking-[0.18em] text-stone">{t("pages.about")}</h1>
          <p className="font-display mt-6 pb-[0.08em] text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.02]">
            {emphasis(statement).map((part, index) =>
              part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
            )}
          </p>
          {text && (
            <div className="mt-12 max-w-[62ch] space-y-5 text-lg leading-relaxed">
              <TextBlocks text={text} />
            </div>
          )}
          {references.length > 0 && (
            <section aria-labelledby="references" className="mt-20">
              <h2 id="references" className="font-label text-xs text-stone">
                {t("about.references")}
              </h2>
              <ul className="mt-6 columns-2 gap-8 font-sport text-3xl md:columns-3 md:text-4xl [&>li]:mb-3 [&>li]:break-inside-avoid">
                {references.map((reference) => (
                  <li key={reference}>{reference}</li>
                ))}
              </ul>
            </section>
          )}
          <Link href="/kontakt" className="link-draw mt-16 inline-block text-xl">
            {t("about.cta")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
