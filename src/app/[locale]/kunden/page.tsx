import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/pathnames";
import { pageMetadata } from "@/lib/seo/metadata";
import { GalleryCodeForm } from "./gallery-code-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata({ path: "/kunden", locale: locale as Locale, title: t("pages.clients"), description: t("meta.descriptions.clients") });
}

/** Einstieg Kundenbereich (Spec §6.3): Galerie-Code → Passwortseite der Galerie. */
export default async function ClientsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <main className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-16 pt-10 md:grid-cols-12 md:gap-8 md:px-8 md:pt-16">
      <div className="md:col-span-6">
        <h1 data-reveal="lines" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("pages.clients")}</h1>
        <p className="mt-6 max-w-[48ch] text-lg text-ink/80">{t("clients.intro")}</p>
      </div>
      <div className="md:col-span-5 md:col-start-8 md:pt-4">
        <GalleryCodeForm />
      </div>
    </main>
  );
}
