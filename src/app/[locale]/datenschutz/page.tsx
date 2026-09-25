import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import { loadSettings } from "@/lib/public/data";
import { legalText } from "@/lib/public/legal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("privacy") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  const { text, fallback } = legalText(settings, "privacy", locale === "de" ? "de" : "en");
  return <LegalPage titleKey="privacy" text={text} fallback={fallback} />;
}
