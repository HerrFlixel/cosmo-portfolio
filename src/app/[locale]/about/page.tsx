import { getTranslations } from "next-intl/server";
import Bio from "@/components/about/Bio";
import ClientLogos from "@/components/about/ClientLogos";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export default async function AboutPage() {
  const t = await getTranslations("about");
  const bioText = (await getSetting("bio_de")) || "Bio-Text wird im Admin-Panel gepflegt.";
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
