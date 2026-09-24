import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-8">
        <Link href="/">{t("back")}</Link>
      </p>
    </main>
  );
}
