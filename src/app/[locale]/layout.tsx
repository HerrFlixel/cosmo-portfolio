import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import CameraNav from "@/components/layout/CameraNav";
import { getSetting } from "@/lib/db/queries";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);

  if (!routing.locales.includes(locale as "de" | "en")) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("home");
  const [statusSetting, instagramUrl, linkedinUrl] = await Promise.all([
    getSetting(locale === "en" ? "status_text_en" : "status_text_de"),
    getSetting("instagram_url"),
    getSetting("linkedin_url"),
  ]);
  const statusText = statusSetting || t("statusFallback");

  return (
    <NextIntlClientProvider messages={messages}>
      <CameraNav statusText={statusText} instagramUrl={instagramUrl} linkedinUrl={linkedinUrl} />
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
