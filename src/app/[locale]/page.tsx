import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category } from "@/lib/categories";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-label text-xs text-stone">Cosmo Photos</p>
      <h1 className="font-display mt-4 text-6xl leading-[0.95]">{t("home.headline")}</h1>
      <p className="mt-6 max-w-md text-stone">{t("home.intro")}</p>

      <ol className="mt-16 space-y-3">
        {CATEGORIES.map((category, i) => (
          <li key={category} className="flex items-baseline gap-4">
            <span className="font-label text-xs text-stone">{String(i + 1).padStart(2, "0")}</span>
            <Link href={`/${category}` as `/${Category}`} className="font-sport text-5xl">
              {t(`categories.${category}`)}
            </Link>
          </li>
        ))}
      </ol>

      <nav className="mt-16 flex flex-wrap gap-6 text-sm">
        <Link href="/ueber-mich">{t("nav.about")}</Link>
        <Link href="/kontakt">{t("nav.contact")}</Link>
        <Link href="/kunden">{t("nav.clients")}</Link>
        <Link href="/impressum">{t("nav.imprint")}</Link>
        <Link href="/datenschutz">{t("nav.privacy")}</Link>
        <Link href="/" locale={locale === "de" ? "en" : "de"}>
          {t("nav.switchLocale")}
        </Link>
      </nav>
    </main>
  );
}
