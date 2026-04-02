import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe: no Prisma / better-sqlite3. Role comes from the JWT (see auth.ts callbacks).
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const path = request.nextUrl.pathname;
  const role = token?.role as string | undefined;

  if (path.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/admin", request.url));
    }
  }
  if (path.startsWith("/producer")) {
    if (role !== "PRODUCER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/producer", request.url));
    }
  }
  if (path.startsWith("/host")) {
    if (role !== "HOST" && role !== "PRODUCER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/host", request.url));
    }
  }
  if (path.startsWith("/account") || path.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/producer/:path*",
    "/host/:path*",
    "/account",
    "/account/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
