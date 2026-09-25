import { getTranslations } from "next-intl/server";
import type { Settings } from "@/lib/settings/schema";

/** Abschluss (Spec §6.1): große Kontaktzeile, Instagram, pictrs-Shop. Ohne gepflegte Angaben entfällt er. */
export async function Closing({ settings }: { settings: Settings }) {
  const t = await getTranslations();
  const { contact_email: email, instagram_url: instagram, pictrs_url: shop } = settings;
  if (!email && !instagram && !shop) return null;
  return (
    <section aria-labelledby="closing-title" className="mx-auto mt-32 max-w-[1400px] px-4 md:mt-48 md:px-8">
      <h2 id="closing-title" className="font-label text-xs uppercase tracking-[0.18em] text-muted">
        {t("home.closingTitle")}
      </h2>
      {email && (
        <a href={`mailto:${email}`} className="font-display mt-6 block break-words pb-[0.1em] text-[clamp(2.25rem,6.5vw,6rem)] italic leading-[1.05] transition-colors hover:text-muted">
          {email}
        </a>
      )}
      {(instagram || shop) && (
        <ul className="mt-10 flex flex-wrap gap-8 text-lg">
          {instagram && (
            <li>
              <a href={instagram} target="_blank" rel="noopener" className="link-draw">
                Instagram <span aria-hidden="true">↗</span>
              </a>
            </li>
          )}
          {shop && (
            <li>
              <a href={shop} target="_blank" rel="noopener" className="link-draw">
                {t("nav.shop")} <span aria-hidden="true">↗</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
