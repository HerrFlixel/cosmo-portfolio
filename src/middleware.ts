import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Admin routes: check auth
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // API and admin/login routes: skip i18n
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Public routes: apply i18n
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|fonts|logo\\.svg|favicon\\.ico).*)"],
};
