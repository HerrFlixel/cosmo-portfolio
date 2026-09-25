"use client";

import { fontVariables } from "./fonts";
import "./globals.css";

/** Fehler im Layout selbst (ohne Sprach-Kontext): zweisprachig und gestaltet wie global-not-found. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de" className={fontVariables}>
      <body>
        <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[62%] -translate-y-[46%] rounded-full border-[1.5px] border-ink/15" />
          <div className="relative text-center">
            <h1 className="font-display text-[clamp(1.75rem,4vw,3rem)]">Da ist etwas schiefgelaufen. / Something went wrong.</h1>
            <button type="button" onClick={reset} className="mt-10 rounded-full bg-ink px-7 py-3 text-paper">
              Neu laden / Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
