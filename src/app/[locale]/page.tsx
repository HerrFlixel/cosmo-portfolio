import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutTeaser } from "@/components/site/home/about-teaser";
import { ChapterSection } from "@/components/site/home/chapter";
import { Closing } from "@/components/site/home/closing";
import { HomeHero } from "@/components/site/home/hero";
import type { Locale } from "@/i18n/pathnames";
import { loadHome, loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale as Locale;
  const [t, home, settings] = await Promise.all([getTranslations("home"), loadHome(), loadSettings()]);
  const headline = (lang === "de" ? settings.hero_headline_de : settings.hero_headline_en) || t("headline");

  return (
    <main>
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
