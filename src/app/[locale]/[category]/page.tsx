import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/site/category/category-grid";
import { CategoryPill } from "@/components/site/category/category-pill";
import type { Locale } from "@/i18n/pathnames";
import { CATEGORIES, isCategory } from "@/lib/categories";
import { mediaUrl } from "@/lib/media/keys";
import { loadCategory } from "@/lib/public/data";
import { altText } from "@/lib/public/images";

type Props = { params: Promise<{ locale: string; category: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

// Nur die fünf Kategorien: sonst rendert z. B. /g/vertippt als locale="g" und endet in der ungestylten Next-404.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isCategory(category)) return {};
  const t = await getTranslations({ locale, namespace: "categories" });
  return { title: t(category) };
}

/** Kategorieseite (Spec §6.2): riesiger Titel bleibt stehen, die Bilder ziehen darüber in drei Spalten vorbei. */
export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategory(category)) notFound();
  setRequestLocale(locale);
  const lang = locale as Locale;
  const [t, content] = await Promise.all([getTranslations(), loadCategory(category)]);
  const name = t(`categories.${category}`);
  const images = content.images.map((image, index) => ({
    id: image.id,
    width: image.width,
    height: image.height,
    color: image.color,
    alt: altText(image, lang, t("home.photoAlt", { category: name, number: index + 1 })),
  }));
  const pill = content.nav.map((item) => ({
    category: item.category,
    name: t(`categories.${item.category}`),
    count: item.count,
    thumb: item.cover ? mediaUrl("portfolio", item.cover.id, 800) : null,
  }));

  return (
    <main className="relative pb-40">
      <div className="sticky top-0 grid h-[100dvh] place-items-center overflow-hidden px-4">
        <div className="flex flex-col items-center">
          <div className="flex items-start gap-2 md:gap-4">
            <h1 data-reveal="lines" className="font-sport text-[clamp(3.25rem,15vw,19rem)]">{name}</h1>
            <span className="pt-[0.6em] font-label text-sm text-muted md:text-base">({images.length})</span>
          </div>
          {/* Ohne Bilder steht der Hinweis unter dem Titel (nicht darübergezogen wie das Raster). */}
          {images.length === 0 && <p className="mt-8 max-w-[40ch] text-center text-lg text-muted">{t("category.empty")}</p>}
        </div>
      </div>
      {images.length > 0 && (
        <div className="relative z-10 -mt-[45dvh]">
          <CategoryGrid images={images} />
        </div>
      )}
      <CategoryPill current={category} items={pill} />
    </main>
  );
}
