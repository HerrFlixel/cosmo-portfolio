import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { PortraitFrame } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { emphasis } from "@/lib/public/text";
import type { Settings } from "@/lib/settings/schema";

/** Über-mich-Teaser (Spec §6.1): Porträt im Passepartout, ein Satz, ein Link. */
export async function AboutTeaser({ settings, locale }: { settings: Settings; locale: Locale }) {
  const t = await getTranslations("home");
  const statement = (locale === "de" ? settings.about_statement_de : settings.about_statement_en) || t("aboutFallback");
  const portrait = settings.about_portrait_id;
  return (
    <section aria-labelledby="about-teaser" className="mx-auto mt-32 grid max-w-[1400px] items-center gap-10 px-4 md:mt-48 md:grid-cols-12 md:gap-8 md:px-8">
      {portrait && <PortraitFrame id={portrait} alt={t("portraitAlt")} className="w-2/3 md:col-span-4 md:col-start-2 md:w-auto md:-rotate-1" />}
      <div className={portrait ? "md:col-span-6 md:col-start-7" : "md:col-span-8 md:col-start-3"}>
        <h2 id="about-teaser" className="sr-only">
          {t("aboutTitle")}
        </h2>
        <p data-reveal="lines" className="font-display pb-[0.08em] text-[clamp(2rem,4.2vw,3.75rem)] leading-[1.05]">
          {emphasis(statement).map((part, index) =>
            part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
          )}
        </p>
        <Link href="/ueber-mich" className="link-draw mt-8 inline-block text-lg">
          {t("aboutLink")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
