import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Bewusst middleware.ts statt proxy.ts: OpenNext unterstützt keine Node-Middleware (Next 16 proxy = Node).
export default createMiddleware(routing);

export const config = {
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, /media (Bilder), Next-Interna und Dateien mit Endung.
  matcher: ["/((?!api(?:/|$)|g(?:/|$)|admin(?:/|$)|media(?:/|$)|_next|_vercel|.*\\..*).*)"],
};
