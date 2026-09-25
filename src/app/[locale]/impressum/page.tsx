import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import { loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("imprint") };
}

export default async function ImprintPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  return <LegalPage titleKey="imprint" text={locale === "de" ? settings.imprint_de : settings.imprint_en} />;
}
