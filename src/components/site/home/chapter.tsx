import { getTranslations } from "next-intl/server";
import { Passepartout } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import type { Category } from "@/lib/categories";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import type { Chapter } from "@/lib/public/content";
import { altText } from "@/lib/public/images";

// Vorschaubilder in lockerem Versatz (Plan 5 gibt ihnen unterschiedliches Tempo).
const PREVIEW_OFFSETS = ["", "lg:mt-20", "lg:mt-8", "lg:mt-28", "lg:mt-12"];

/**
 * Kapitel „Einlauf“ (Spec §6.1), statisch: ein dunkles Band („Licht aus“) mit Kapitelbild, Titel und Zähler,
 * danach die Vorschaubilder bei Tageslicht. Plan 5 fixiert das Kapitel und blendet zwischen beiden Zuständen.
 */
export async function ChapterSection({ chapter, index, locale }: { chapter: Chapter; index: number; locale: Locale }) {
  if (!chapter.image) return null;
  const t = await getTranslations();
  const name = t(`categories.${chapter.category}`);
  const alt = (image: PortfolioImage, number: number) => altText(image, locale, t("home.photoAlt", { category: name, number }));
  const flip = index % 2 === 1;

  return (
    <section aria-labelledby={`chapter-${chapter.category}`} data-chapter={chapter.category} className="mt-28 md:mt-40">
      <div className="bg-hall text-hall-ink">
        <div className="mx-auto grid max-w-[1400px] items-end gap-10 px-4 py-20 md:grid-cols-12 md:gap-8 md:px-8 md:py-32">
          <Passepartout
            image={chapter.image}
            alt={alt(chapter.image, 1)}
            sizes="(min-width: 768px) 56vw, 100vw"
            className={flip ? "md:col-span-7 md:col-start-6 md:row-start-1" : "md:col-span-7"}
          />
          <div className={flip ? "md:col-span-5 md:col-start-1 md:row-start-1" : "md:col-span-5"}>
            <h2 id={`chapter-${chapter.category}`} className="font-sport text-[clamp(4rem,11vw,10.5rem)]">
              {name}
            </h2>
            <p className="mt-5 flex items-center gap-3 font-label text-sm text-hall-ink/70">
              <span aria-hidden="true" className="size-2 rounded-full bg-signal" />
              <span>
                ({chapter.count}
                <span className="sr-only"> {t("home.photos")}</span>)
              </span>
            </p>
          </div>
        </div>
      </div>

      {chapter.previews.length > 0 && (
        <ul className="mx-auto grid max-w-[1400px] grid-cols-2 items-start gap-4 px-4 pt-14 sm:grid-cols-3 md:gap-8 md:px-8 lg:grid-cols-5">
          {chapter.previews.map((image, i) => (
            <li key={image.id} className={PREVIEW_OFFSETS[i]}>
              <Passepartout image={image} alt={alt(image, i + 2)} sizes="(min-width: 1024px) 17vw, (min-width: 640px) 30vw, 46vw" />
            </li>
          ))}
        </ul>
      )}

      <p className="mx-auto max-w-[1400px] px-4 pt-10 md:px-8">
        <Link href={`/${chapter.category}` as `/${Category}`} className="link-draw text-lg">
          {t("home.allPhotos", { category: name })} <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
