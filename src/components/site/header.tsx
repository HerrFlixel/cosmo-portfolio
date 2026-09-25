import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { LocaleSwitch } from "./locale-switch";
import { Wordmark } from "./logo";
import { MobileMenu } from "./mobile-menu";

/** Kopf (Spec §5.1): Wortmarke ≈ 10 % der Breite, eine Zeile Navigation ab lg, darunter das Vollbild-Menü. */
export async function SiteHeader({ shopUrl }: { shopUrl: string }) {
  const [t, locale] = await Promise.all([getTranslations("nav"), getLocale()]);
  const workHref = `${getPathname({ href: "/", locale: locale as Locale })}#arbeiten`;
  return (
    <header className="relative z-20">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" aria-label={t("home")} data-site-logo data-intro-hide className="block w-[clamp(104px,10vw,150px)]">
          <Wordmark id="logo-header" withPhotos decorative className="block h-auto w-full" />
        </Link>
        <nav aria-label={t("main")} data-intro="nav" data-intro-hide className="hidden items-center gap-8 text-[15px] lg:flex">
          <NextLink href={workHref} className="link-draw">
            {t("work")}
          </NextLink>
          <Link href="/ueber-mich" className="link-draw">{t("about")}</Link>
          <Link href="/kontakt" className="link-draw">{t("contact")}</Link>
          <Link href="/kunden" className="link-draw">{t("clients")}</Link>
          {shopUrl && (
            <a href={shopUrl} target="_blank" rel="noopener" className="link-draw">
              {t("shop")} <span aria-hidden="true">↗</span>
            </a>
          )}
          <LocaleSwitch className="font-label text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink" />
        </nav>
        <MobileMenu shopUrl={shopUrl} />
      </div>
    </header>
  );
}
