import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/ContactForm";
import { getSetting } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktiere Cosmo Photos für Buchungsanfragen und Kooperationen.",
};

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const [contactEmailSetting, instagramUrl, linkedinUrl] = await Promise.all([
    getSetting("contact_email"),
    getSetting("instagram_url"),
    getSetting("linkedin_url"),
  ]);
  const contactEmail = contactEmailSetting || "info@cosmophotos.de";

  const socials = [
    instagramUrl ? { label: "Instagram", url: instagramUrl } : null,
    linkedinUrl ? { label: "LinkedIn", url: linkedinUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-14 max-w-6xl">
        <div>
          <h1 className="text-4xl md:text-[44px] font-semibold tracking-tight leading-[1.05]">
            {t("headline")}
          </h1>
          <a
            href={`mailto:${contactEmail}`}
            className="inline-block font-mono text-sm border-b border-ink pb-0.5 mt-7 hover:text-fog hover:border-fog transition-colors"
          >
            {contactEmail}
          </a>
          {socials.length > 0 && (
            <div className="flex gap-6 mt-8">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-fog hover:text-ink transition-colors"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
