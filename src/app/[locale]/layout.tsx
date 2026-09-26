import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { MotionRoot } from "@/components/motion/motion-root";
import { PageTransition } from "@/components/motion/page-transition";
import { routing } from "@/i18n/routing";
import { bootMotion } from "@/lib/motion/boot";
import { SITE_URL } from "@/lib/site";
import { loadSettings } from "@/lib/public/data";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Nur de/en sind Sprachen: /admin, /g/…, /api/… landen sonst als locale="admin" hier
// und zeigen die ungestylte Next-404 statt global-not-found.
export const dynamicParams = false;

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { metadataBase: new URL(SITE_URL), title: { default: t("title"), template: "%s · Cosmo Photos" }, description: t("description") };
}

// Vor dem ersten Zeichnen: Bewegung an/aus und Intro vormerken (Funktion ohne Importe, als Inline-Skript).
const BOOT_SCRIPT = `(${bootMotion.toString()})(window);`;

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const [t, settings] = await Promise.all([getTranslations("nav"), loadSettings()]);

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <NextIntlClientProvider>
          <MotionRoot>
            <a href="#inhalt" className="skip-link">
              {t("skip")}
            </a>
            {/* Kopf, Inhalt und Fußzeile wechseln gemeinsam: ein bildschirmhoher Vorhang statt einzelner Teile. */}
            <PageTransition>
              <div className="flex min-h-dvh flex-col">
                <SiteHeader shopUrl={settings.pictrs_url} />
                <div id="inhalt" tabIndex={-1} className="flex-1 outline-none">
                  {children}
                </div>
                <SiteFooter settings={settings} />
              </div>
            </PageTransition>
          </MotionRoot>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
