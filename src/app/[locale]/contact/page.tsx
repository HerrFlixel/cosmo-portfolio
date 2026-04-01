import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/ContactForm";
import { getSetting } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktiere Cosmo Photos für Buchungsanfragen, Kooperationen und weitere Informationen.",
};

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const contactEmail = (await getSetting("contact_email")) || "info@cosmophotos.de";
  const instagramUrl = await getSetting("instagram_url");
  const linkedinUrl = await getSetting("linkedin_url");

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <ContactForm />

        <div className="space-y-8">
          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">E-Mail</h3>
            <a
              href={`mailto:${contactEmail}`}
              className="font-body text-primary hover:text-secondary transition-colors"
            >
              {contactEmail}
            </a>
          </div>

          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">Social Media</h3>
            <div className="flex gap-4">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-secondary hover:text-primary transition-colors"
                >
                  Instagram
                </a>
              )}
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-secondary hover:text-primary transition-colors"
                >
                  LinkedIn
                </a>
              )}
              {!instagramUrl && !linkedinUrl && (
                <span className="text-muted text-sm">Links werden im Admin-Panel gepflegt</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
