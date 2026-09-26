import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import type { Locale } from "@/i18n/pathnames";
import { loadSettings } from "@/lib/public/data";
import { legalText } from "@/lib/public/legal";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata({ path: "/datenschutz", locale: locale as Locale, title: t("pages.privacy"), description: t("meta.descriptions.privacy") });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  const { text, fallback } = legalText(settings, "privacy", locale === "de" ? "de" : "en");
  return <LegalPage titleKey="privacy" text={text} fallback={fallback} />;
}
