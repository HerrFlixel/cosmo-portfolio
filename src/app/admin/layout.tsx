import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Cosmo Photos", template: "%s · Admin · Cosmo Photos" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={fontVariables}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
