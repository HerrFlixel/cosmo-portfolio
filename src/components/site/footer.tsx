import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Settings } from "@/lib/settings/schema";
import { LocaleSwitch } from "./locale-switch";
import { Lockup } from "./logo";

const currentYear = () => new Date().getFullYear();

/** Fußzeile (Spec §6.1): großer Lockup, Pflichtseiten, Links, Sprache. */
export async function SiteFooter({ settings }: { settings: Settings }) {
  const t = await getTranslations();
  return (
    <footer className="mt-32 md:mt-48">
      <div className="mx-auto max-w-[1400px] px-4 pb-10 md:px-8">
        <Lockup className="block h-auto w-[min(640px,84vw)]" />
        <div className="mt-12 flex flex-col gap-6 border-t border-ink/15 pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/impressum" className="link-draw">{t("nav.imprint")}</Link>
            <Link href="/datenschutz" className="link-draw">{t("nav.privacy")}</Link>
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener" className="link-draw">
                Instagram
              </a>
            )}
            {settings.pictrs_url && (
              <a href={settings.pictrs_url} target="_blank" rel="noopener" className="link-draw">
                {t("nav.shop")}
              </a>
            )}
            <LocaleSwitch className="link-draw" />
          </nav>
          <p className="font-label text-xs text-muted">{t("footer.rights", { year: currentYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
