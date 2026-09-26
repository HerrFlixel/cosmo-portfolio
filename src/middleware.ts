import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy, createNonce } from "./lib/csp";

// Bewusst middleware.ts statt proxy.ts: OpenNext unterstützt keine Node-Middleware (Next 16 proxy = Node).
const handleI18nRouting = createMiddleware(routing);

/**
 * Pro Anfrage eine Nonce: Next liest die CSP aus den Anfrage-Headern und versieht seine Skripte damit; das Layout
 * holt sie für das Boot-Skript aus x-nonce. next-intl reicht die Anfrage-Header weiter (request: { headers }).
 */
export default function middleware(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  const response = handleI18nRouting(new NextRequest(request, { headers }));
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, /media (Bilder), Next-Interna und Dateien mit Endung.
  // /api/… läuft bewusst durch die Middleware (es gibt keine API-Routen): So erreicht nie eine ungültige
  // „Sprache“ das dynamische [locale]-Layout, das sonst die ungestaltete Next-404 statt global-not-found zeigt.
  matcher: ["/((?!g(?:/|$)|admin(?:/|$)|media(?:/|$)|_next|_vercel|.*\\..*).*)"],
};
