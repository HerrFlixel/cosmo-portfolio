import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** 404 (Spec §6.3): großer, leicht verschobener Ring hinter der Meldung. */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="relative mx-auto grid min-h-[70dvh] max-w-[1400px] place-items-center overflow-hidden px-4">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[38%] -translate-y-[54%] rounded-full border-[1.5px] border-ink/15" />
      <div className="relative text-center">
        <p className="font-label text-sm text-stone">404</p>
        <h1 className="font-display mt-4 text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("title")}</h1>
        <p className="mt-5 text-stone">{t("text")}</p>
        <Link href="/" className="link-draw mt-10 inline-block text-lg">
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
