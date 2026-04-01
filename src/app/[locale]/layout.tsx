import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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

  return (
    <NextIntlClientProvider messages={messages}>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
