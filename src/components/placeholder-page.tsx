import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type PageKey = "about" | "contact" | "clients" | "imprint" | "privacy";

/** Vorläufige Seite mit Titel; wird in Plan 4 durch die echten Seiten ersetzt. */
export async function PlaceholderPage({ titleKey }: { titleKey: PageKey }) {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">{t(`pages.${titleKey}`)}</h1>
      <p className="mt-8">
        <Link href="/">{t("notFound.back")}</Link>
      </p>
    </main>
  );
}
