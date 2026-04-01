import { getTranslations } from "next-intl/server";
import { getSetting } from "@/lib/db/queries";

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  const instagramUrl = await getSetting("instagram_url");
  const linkedinUrl = await getSetting("linkedin_url");

  const socialLinks = [
    instagramUrl ? { label: "Instagram", url: instagramUrl } : null,
    linkedinUrl ? { label: "LinkedIn", url: linkedinUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <footer className="border-t-2 border-primary bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-heading text-xl tracking-wider">COSMO PHOTOS</span>

          {socialLinks.length > 0 && (
            <div className="flex gap-6">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <p className="text-muted text-xs tracking-label uppercase">
            &copy; {year} Cosmo Photos. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
