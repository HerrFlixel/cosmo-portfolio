import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
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
  const [instagramUrl, linkedinUrl] = await Promise.all([
    getSetting("instagram_url"),
    getSetting("linkedin_url"),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <CameraNav instagramUrl={instagramUrl} linkedinUrl={linkedinUrl} />
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
