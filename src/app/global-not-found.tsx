import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404 · Cosmo Photos" };

export default function GlobalNotFound() {
  return (
    <html lang="de" className={fontVariables}>
      <body>
        <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[38%] -translate-y-[54%] rounded-full border-[1.5px] border-ink/15" />
          <div className="relative text-center">
            <p className="font-display text-[clamp(1.75rem,4vw,3rem)]">404 · Seite nicht gefunden / Page not found</p>
            <p className="mt-8">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-not-found rendert ohne Router-Kontext; next/link bricht dort das Rendern ab */}
              <a href="/" className="link-draw">cosmo-photos.de</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
