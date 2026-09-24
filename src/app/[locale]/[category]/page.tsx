import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, isCategory } from "@/lib/categories";

type Props = { params: Promise<{ locale: string; category: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

// Nur die fünf Kategorien: sonst rendert z. B. /g/vertippt als locale="g" und endet in der ungestylten Next-404.
export const dynamicParams = false;

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategory(category)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-sport text-8xl">{t(`categories.${category}`)}</h1>
      <p className="mt-10">
        <Link href="/">{t("notFound.back")}</Link>
      </p>
    </main>
  );
}
