import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Route protection for Next.js 16+ (`proxy.ts` replaces `middleware.ts`).
 * We use `getToken` here instead of `auth()` so the edge bundle exports a plain
 * `function` (Next validates `typeof proxy === 'function'`).
 *
 * `AUTH_SECRET` must be set at runtime (Railway variables) so JWTs verify.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  const token = secret
    ? await getToken({
        req: request,
        secret,
        secureCookie: process.env.NODE_ENV === "production",
      })
    : null;

  const role = token?.role as string | undefined;
  const isLoggedIn = !!token;

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
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, request.url),
      );
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /** Broad enough for x-pathname on /live; skips static assets */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
