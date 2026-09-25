import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "@/app/fonts";
import { galleryI18n } from "@/lib/galleries/i18n";
import "../globals.css";

export const metadata: Metadata = { title: "Galerie · Cosmo Photos", robots: { index: false, follow: false } };

export default async function GalleryRootLayout({ children }: { children: ReactNode }) {
  const { locale, messages } = await galleryI18n();
  return (
    <html lang={locale} className={fontVariables}>
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
