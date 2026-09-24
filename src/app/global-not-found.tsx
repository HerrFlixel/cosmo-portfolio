import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "404 · Cosmo Photos" };

export default function GlobalNotFound() {
  return (
    <html lang="de">
      <body>
        <main className="grid min-h-dvh place-items-center px-6">
          <p>404 · Seite nicht gefunden / Page not found</p>
        </main>
      </body>
    </html>
  );
}
