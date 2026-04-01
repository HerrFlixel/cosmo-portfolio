import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: check auth
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // API and admin/login routes: skip i18n
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Public routes: apply i18n
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|fonts|logo\\.svg|favicon\\.ico).*)"],
};
