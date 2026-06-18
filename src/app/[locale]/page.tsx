import HomeClient from "@/components/home/HomeClient";
import { getProjectsWithCovers, getSetting } from "@/lib/db/queries";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations("home");
  const [projectsRaw, statusSetting] = await Promise.all([
    getProjectsWithCovers(),
    getSetting(locale === "en" ? "status_text_en" : "status_text_de"),
  ]);
  const projects = projectsRaw.slice(0, 6).map((p) => ({
    id: p.id,
    slug: p.slug,
    titleDe: p.titleDe,
    titleEn: p.titleEn,
    category: p.category,
    year: p.year,
    coverId: p.coverId,
  }));
  const statusText = statusSetting || t("statusFallback");

  return <HomeClient projects={projects} statusText={statusText} />;
}
