import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Bio from "@/components/about/Bio";
import ClientLogos from "@/components/about/ClientLogos";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Über mich",
  description:
    "Lerne Cosmo Photos kennen — professioneller Sportfotograf für Vereine, Teams und Medienproduktionen.",
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("about");
  const bioKey = locale === "en" ? "bio_en" : "bio_de";
  const bioText = (await getSetting(bioKey)) || "Bio-Text wird im Admin-Panel gepflegt.";
  const logos = await getClientLogos();

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <Bio text={bioText} />
      <ClientLogos logos={logos} />
    </div>
  );
}
