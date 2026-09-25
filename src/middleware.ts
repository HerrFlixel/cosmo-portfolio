import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Bewusst middleware.ts statt proxy.ts: OpenNext unterstützt keine Node-Middleware (Next 16 proxy = Node).
export default createMiddleware(routing);

export const config = {
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, /media (Bilder), Next-Interna und Dateien mit Endung.
  // /api/… läuft bewusst durch die Middleware (es gibt keine API-Routen): So erreicht nie eine ungültige
  // „Sprache“ das dynamische [locale]-Layout, das sonst die ungestaltete Next-404 statt global-not-found zeigt.
  matcher: ["/((?!g(?:/|$)|admin(?:/|$)|media(?:/|$)|_next|_vercel|.*\\..*).*)"],
};
