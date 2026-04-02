import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Use NextAuth's `auth()` wrapper so the session is resolved like server components.
 * `getToken({ secret })` in Edge often sees an empty AUTH_SECRET at build time, so JWTs
 * never verify on Railway — logged-in users look anonymous to middleware.
 */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role;
  const isLoggedIn = !!req.auth?.user;

  if (path.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/admin", req.url));
    }
  }
  if (path.startsWith("/producer")) {
    if (role !== "PRODUCER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/producer", req.url));
    }
  }
  if (path.startsWith("/host")) {
    if (role !== "HOST" && role !== "PRODUCER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?callbackUrl=/host", req.url));
    }
  }
  if (path.startsWith("/account") || path.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, req.url),
      );
    }
  }

  return NextResponse.next();
});

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
