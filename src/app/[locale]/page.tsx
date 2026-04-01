import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("hero");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="font-heading text-6xl tracking-wide">COSMO PHOTOS</h1>
      <p className="font-body text-secondary tracking-label uppercase text-sm">
        {t("tagline")}
      </p>
    </main>
  );
}
