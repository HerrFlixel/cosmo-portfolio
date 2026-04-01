import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Cosmo Photos",
    default: "Cosmo Photos — Sportfotografie",
  },
  description:
    "Professionelle Sportfotografie für Vereine, Teams und Medien. Actiongeladene Bilder von Spielen, Wettkämpfen und Sportevents.",
  keywords: [
    "Sportfotografie",
    "Sports Photography",
    "Cosmo Photos",
    "Vereinsfotografie",
    "Actionfotografie",
    "Sportbilder",
    "Fotograf",
    "Deutschland",
  ],
  authors: [{ name: "Cosmo Photos" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    alternateLocale: "en_US",
    siteName: "Cosmo Photos",
    title: "Cosmo Photos — Sportfotografie",
    description:
      "Professionelle Sportfotografie für Vereine, Teams und Medien.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
