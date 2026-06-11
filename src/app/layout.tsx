import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Cosmo Photos",
    default: "Cosmo Photos — Fotograf für Sport, Hochzeiten & Events",
  },
  description:
    "Cosmo Photos — Fotografie für Vereine, Paare und Veranstalter. Sport, Hochzeiten und Events: ehrlich, nah dran, ohne Pose.",
  keywords: [
    "Sportfotografie",
    "Hochzeitsfotograf",
    "Eventfotografie",
    "Cosmo Photos",
    "Fotograf",
    "Deutschland",
  ],
  authors: [{ name: "Cosmo Photos" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "de_DE",
    alternateLocale: "en_US",
    siteName: "Cosmo Photos",
    title: "Cosmo Photos — Fotograf für Sport, Hochzeiten & Events",
    description:
      "Fotografie für Vereine, Paare und Veranstalter — ehrlich, nah dran, ohne Pose.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
