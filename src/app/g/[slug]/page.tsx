import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/env";
import { galleryI18n } from "@/lib/galleries/i18n";
import { galleryState, getGalleryBySlug, listImages, logEvent, normalizeVisitorName } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { SLUG_PATTERN } from "@/lib/galleries/slug";
import { GALLERY_COOKIE, VISITOR_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";
import { GalleryView } from "./gallery-view";
import { LocaleSwitch } from "./locale-switch";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

const nowSeconds = () => Math.floor(Date.now() / 1000);

type Props = { params: Promise<{ slug: string }> };

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const db = getDb();
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery) notFound();
  const state = galleryState(gallery, new Date());
  if (state === "draft") notFound();
  const { t } = await galleryI18n();

  if (state === "expired") {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-4xl">{t("expiredTitle")}</h1>
          <p className="mt-4 text-stone">{t("expiredText")}</p>
          <Link href="/kontakt" className="mt-8 inline-block underline">
            {t("contact")}
          </Link>
        </div>
      </main>
    );
  }

  const jar = await cookies();
  const unlocked = await verifyGalleryToken(jar.get(GALLERY_COOKIE)?.value, gallerySecret(), gallery, nowSeconds());
  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="flex w-full flex-col items-center text-center">
          <p className="font-label text-xs text-stone">{t("private")}</p>
          <h1 className="font-display mt-3 text-5xl">{gallery.title}</h1>
          <PasswordForm slug={slug} />
          <div className="mt-10">
            <LocaleSwitch />
          </div>
        </div>
      </main>
    );
  }

  // Next liefert Cookie-Werte bereits dekodiert.
  const visitor = normalizeVisitorName(jar.get(VISITOR_COOKIE)?.value);
  const images = await listImages(db, gallery.id);
  await logEvent(db, { galleryId: gallery.id, type: "view", visitorName: visitor });

  return (
    <GalleryView
      slug={slug}
      title={gallery.title}
      shootDate={gallery.shootDate}
      expiresAt={gallery.expiresAt}
      coverId={gallery.coverImageId}
      images={images.map(({ id, filename, width, height, color, bytes }) => ({ id, filename, width, height, color, bytes }))}
    />
  );
}
