import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmo Photos — Sportfotografie",
  description: "Professionelle Sportfotografie für Vereine, Teams und Medien",
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
