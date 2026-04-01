import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Downloads",
  description: "Exklusiver Bereich für Kunden zum Download ihrer Sportfotos.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DownloadsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
