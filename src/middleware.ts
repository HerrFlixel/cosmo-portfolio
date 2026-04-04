import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API and admin routes: skip i18n
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Public routes: apply i18n
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|fonts|logo\\.svg|favicon\\.ico).*)"],
};
