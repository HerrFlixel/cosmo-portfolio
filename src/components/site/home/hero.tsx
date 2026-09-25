import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Passepartout } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import { altText } from "@/lib/public/images";
import { emphasis } from "@/lib/public/text";

// Lose Collage (Spec §6.1): drei Abzüge, leicht gedreht und überlappend; unter lg als Raster gestapelt.
const COLLAGE = [
  "col-span-2 lg:absolute lg:left-[2%] lg:top-[10%] lg:z-10 lg:w-[50%] lg:-rotate-2",
  "lg:absolute lg:right-0 lg:top-0 lg:w-[40%] lg:rotate-[1.5deg]",
  "lg:absolute lg:bottom-0 lg:right-[14%] lg:z-20 lg:w-[36%] lg:-rotate-1",
];

type Props = { headline: string; heroes: PortfolioImage[]; counts: Record<Category, number>; locale: Locale };

export async function HomeHero({ headline, heroes, counts, locale }: Props) {
  const t = await getTranslations();
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-14">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <h1 id="hero-title" data-intro="headline" data-intro-hide className="font-display pb-[0.08em] text-[clamp(2.75rem,7vw,6.75rem)] leading-[0.98] lg:col-span-6">
          {emphasis(headline).map((part, index) =>
            part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
          )}
        </h1>
        {heroes.length > 0 && (
          <div data-intro="collage" data-intro-hide className="grid grid-cols-2 gap-4 lg:relative lg:col-span-6 lg:block lg:h-[min(68vh,700px)]">
            {heroes.map((image, index) => (
              <Passepartout
                key={image.id}
                image={image}
                alt={altText(image, locale, t("home.photoAlt", { category: t(`categories.${image.category}`), number: index + 1 }))}
                sizes="(min-width: 1024px) 28vw, 50vw"
                priority={index === 0}
                className={COLLAGE[index]}
              />
            ))}
          </div>
        )}
      </div>

      <nav id="arbeiten" aria-label={t("home.index")} data-intro="index" data-intro-hide className="mt-16 scroll-mt-6 border-t border-ink/15 pt-6 md:mt-24">
        <ol className="grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-6">
          {CATEGORIES.map((category, index) => (
            <li key={category} className="flex items-baseline gap-3 lg:flex-col lg:gap-1">
              <span className="font-label text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
              <Link href={`/${category}` as `/${Category}`} className="font-sport text-[clamp(1.75rem,2.6vw,2.5rem)] transition-colors hover:text-muted">
                {t(`categories.${category}`)}
              </Link>
              <span className="font-label text-xs text-muted">({counts[category]})</span>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
