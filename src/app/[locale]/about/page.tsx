import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Über mich",
  description:
    "Cosmo Photos — Fotograf für Sport, Hochzeiten und Events. Nah dran, ohne aufzufallen.",
};

export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations("about");
  const suffix = locale === "en" ? "_en" : "_de";
  const [headlineSetting, bioSetting, aboutImageId, logos] = await Promise.all([
    getSetting(`about_headline${suffix}`),
    getSetting(`bio${suffix}`),
    getSetting("about_image_id"),
    getClientLogos(),
  ]);
  const headline = headlineSetting || t("headlineFallback");
  const bio = bioSetting || "";

  return (
    <div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-20">
      <h1 className="text-3xl md:text-[38px] font-medium tracking-tight leading-tight max-w-3xl">
        {headline}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-12">
        <div className="md:col-span-7">
          {aboutImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/drive/image/${aboutImageId}?w=1200`}
              alt="Cosmo Photos"
              className="w-full max-h-[70vh] object-cover"
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-hairline" />
          )}
        </div>

        <div className="md:col-span-5 md:pt-14">
          <p className="text-xs tracking-label uppercase text-fog mb-4">{t("label")}</p>
          <div className="text-sm leading-[1.85] text-ink/75 whitespace-pre-line">{bio}</div>

          {logos.length > 0 && (
            <>
              <p className="text-xs tracking-label uppercase text-fog mt-10 mb-4">
                {t("clients")}
              </p>
              <div className="flex flex-wrap items-center gap-8">
                {logos.map((logo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={logo.id}
                    src={logo.imageUrl}
                    alt={logo.name}
                    className="h-9 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
