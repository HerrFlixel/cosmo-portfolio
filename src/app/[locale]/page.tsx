import HomeClient from "@/components/home/HomeClient";
import { getProjectsWithCovers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projectsRaw = await getProjectsWithCovers();
  const projects = projectsRaw.slice(0, 6).map((p) => ({
    id: p.id,
    slug: p.slug,
    titleDe: p.titleDe,
    titleEn: p.titleEn,
    category: p.category,
    year: p.year,
    coverId: p.coverId,
  }));

  return <HomeClient projects={projects} />;
}
