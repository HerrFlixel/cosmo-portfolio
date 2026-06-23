import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSetting } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Werbung & Affiliate-Hinweise",
  description:
    "Hinweise zu Werbung und Affiliate-Links auf dieser Website und dem Cosmo-Photos-Pinterest-Profil.",
};

export default async function AdvertisingPage() {
  const t = await getTranslations("advertising");
  const pinterestUrl = await getSetting("pinterest_url");

  return (
    <div className="pt-20 md:pt-[124px] px-6 md:px-10 pb-20 max-w-3xl">
      <h1 className="text-3xl md:text-[38px] font-medium tracking-tight leading-tight">
        {t("title")}
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-[1.85] text-ink/75">
        <p>{t("body1")}</p>
        <p>{t("body2")}</p>
      </div>
      {pinterestUrl && (
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-9 bg-ink text-paper text-xs tracking-[.1em] uppercase px-7 py-3.5 hover:opacity-80 transition-opacity"
        >
          {t("pinterest")} ↗
        </a>
      )}
    </div>
  );
}
