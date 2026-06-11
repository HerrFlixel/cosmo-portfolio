import HomeClient from "@/components/home/HomeClient";
import { getProjectsWithCovers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = (await getProjectsWithCovers()).slice(0, 6);

  return (
    <HomeClient
      projects={projects.map((p) => ({
        id: p.id,
        slug: p.slug,
        titleDe: p.titleDe,
        titleEn: p.titleEn,
        category: p.category,
        year: p.year,
        coverId: p.coverId,
      }))}
    />
  );
}
