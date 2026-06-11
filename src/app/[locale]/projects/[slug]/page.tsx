import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ProjectGallery from "@/components/project/ProjectGallery";
import { getProjectBySlug, getProjectImages, getVisibleProjects } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await Promise.resolve(params);
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const title = locale === "en" && project.titleEn ? project.titleEn : project.titleDe;
  return { title };
}

export default async function ProjectPage({ params }: Props) {
  const { slug, locale } = await Promise.resolve(params);
  const t = await getTranslations("project");
  const tc = await getTranslations("categories");

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [imgs, all] = await Promise.all([getProjectImages(project.id), getVisibleProjects()]);
  const index = Math.max(0, all.findIndex((p) => p.id === project.id));
  const prev = all[(index - 1 + all.length) % all.length];
  const next = all[(index + 1) % all.length];

  const title = (p: { titleDe: string; titleEn: string | null }) =>
    locale === "en" && p.titleEn ? p.titleEn : p.titleDe;

  const coverId =
    (project.coverImageId && imgs.some((img) => img.id === project.coverImageId)
      ? project.coverImageId
      : imgs[0]?.id) ?? null;
  const gridIds = imgs.map((img) => img.id).filter((id) => id !== coverId);

  return (
    <div className="pt-[100px] px-6 md:px-10 pb-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-fog mb-3">
            {String(index + 1).padStart(2, "0")} / {tc(project.category as "sport" | "hochzeit" | "event")}
          </p>
          <h1 className="text-4xl md:text-[54px] font-semibold tracking-tight leading-[.95]">
            {title(project)}
          </h1>
        </div>
        <div className="font-mono text-xs text-fog md:text-right leading-loose">
          {project.year}
          {project.location && (
            <>
              <br />
              {project.location}
            </>
          )}
          <br />
          {t("images", { count: imgs.length })}
        </div>
      </div>

      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/drive/image/${coverId}?w=1920`}
          alt={title(project)}
          className="w-full max-h-[70vh] object-cover mt-8"
        />
      )}

      {gridIds.length > 0 && (
        <div className="mt-3.5">
          <ProjectGallery imageIds={gridIds} />
        </div>
      )}

      {all.length > 1 && (
        <div className="flex justify-between items-center mt-12 pt-5 border-t border-hairline">
          <Link
            href={{ pathname: "/projects/[slug]", params: { slug: prev.slug } }}
            className="font-mono text-xs text-fog hover:text-ink transition-colors"
          >
            ← {t("prev")}
          </Link>
          <Link
            href={{ pathname: "/projects/[slug]", params: { slug: next.slug } }}
            className="text-[15px] font-medium hover:text-fog transition-colors"
          >
            {t("next")}: {title(next)} →
          </Link>
        </div>
      )}
    </div>
  );
}
