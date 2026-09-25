import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { contactConfig } from "@/lib/contact/submit";
import { loadSettings } from "@/lib/public/data";
import { ContactForm } from "./contact-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("contact") };
}

/** Kontakt (Spec §6.3): Bodoni-Headline, schlichtes Formular; ohne Konfiguration die Mail-Adresse. */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations(), loadSettings()]);
  const { env } = getCloudflareContext();
  const siteKey = typeof env.TURNSTILE_SITE_KEY === "string" ? env.TURNSTILE_SITE_KEY : "";
  const ready = siteKey !== "" && contactConfig(env as unknown as Record<string, unknown>) !== null;
  const email = settings.contact_email;

  return (
    <main className="mx-auto grid max-w-[1400px] gap-16 px-4 pb-16 pt-10 md:grid-cols-12 md:gap-8 md:px-8 md:pt-16">
      <div className="md:col-span-5">
        <h1 data-reveal="lines" className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("pages.contact")}</h1>
        <p className="font-display mt-6 pb-1 text-[clamp(1.5rem,2.6vw,2.25rem)] italic leading-[1.15] text-ink/80">{t("contact.statement")}</p>
        {email && (
          <div className="mt-12">
            <p className="text-sm text-muted">{t("contact.direct")}</p>
            <a href={`mailto:${email}`} className="link-draw mt-2 inline-block text-lg">
              {email}
            </a>
          </div>
        )}
        {settings.instagram_url && (
          <a href={settings.instagram_url} target="_blank" rel="noopener" className="link-draw mt-6 inline-block text-lg">
            Instagram <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <div className="md:col-span-6 md:col-start-7">
        {ready ? (
          <ContactForm siteKey={siteKey} fallbackEmail={email} />
        ) : (
          <p className="text-lg">
            {email ? (
              <>
                {t("contact.unavailable")}{" "}
                <a href={`mailto:${email}`} className="underline underline-offset-4">
                  {email}
                </a>
              </>
            ) : (
              t("contact.unavailableNoMail")
            )}
          </p>
        )}
      </div>
    </main>
  );
}
