import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeIntro } from "@/components/motion/home-intro";
import { AboutTeaser } from "@/components/site/home/about-teaser";
import { ChapterSection } from "@/components/site/home/chapter";
import { Closing } from "@/components/site/home/closing";
import { HomeHero } from "@/components/site/home/hero";
import type { Locale } from "@/i18n/pathnames";
import { loadHome, loadSettings } from "@/lib/public/data";
import { pageMetadata, portfolioOgImage } from "@/lib/seo/metadata";
import { jsonLdScript, personJsonLd } from "@/lib/seo/person";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, home] = await Promise.all([getTranslations({ locale, namespace: "meta" }), loadHome()]);
  const hero = home.heroes[0];
  return pageMetadata({
    path: "/",
    locale: locale as Locale,
    title: t("title"),
    absoluteTitle: true,
    description: t("description"),
    image: hero ? portfolioOgImage(hero, t("title")) : null,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale as Locale;
  const [t, home, settings] = await Promise.all([getTranslations("home"), loadHome(), loadSettings()]);
  const headline = (lang === "de" ? settings.hero_headline_de : settings.hero_headline_en) || t("headline");

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd(settings, lang)) }} />
      {/* Intro-Vorhang („Seite zuerst“, Plan 6): nur sichtbar, solange html[data-intro] gesetzt ist. */}
      <div data-intro-curtain aria-hidden="true" className="intro-curtain" />
      <HomeIntro />
      <HomeHero headline={headline} heroes={home.heroes} counts={home.counts} locale={lang} />
      {home.chapters
        .filter((chapter) => chapter.image)
        .map((chapter, index) => (
          <ChapterSection key={chapter.category} chapter={chapter} index={index} locale={lang} />
        ))}
      <AboutTeaser settings={settings} locale={lang} />
      <Closing settings={settings} />
    </main>
  );
}
