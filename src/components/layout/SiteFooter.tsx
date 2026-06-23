import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function SiteFooter({
  instagramUrl,
  linkedinUrl,
  pinterestUrl,
}: {
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  pinterestUrl?: string | null;
}) {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  const socials = [
    instagramUrl ? { label: "Instagram", url: instagramUrl } : null,
    pinterestUrl ? { label: t("pinterest"), url: pinterestUrl } : null,
    linkedinUrl ? { label: "LinkedIn", url: linkedinUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <footer className="border-t border-hairline px-6 md:px-10 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-mono text-[11px] tracking-[0.04em] text-fog">
        <span>© {year} Cosmo Photos</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              {s.label} ↗
            </a>
          ))}
          <Link href="/advertising" className="hover:text-ink transition-colors">
            {t("advertising")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
