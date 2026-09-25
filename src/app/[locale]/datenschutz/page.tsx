import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import { loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("privacy") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  return <LegalPage titleKey="privacy" text={locale === "de" ? settings.privacy_de : settings.privacy_en} />;
}
