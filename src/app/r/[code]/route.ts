import { NextResponse } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SEC,
  parseReferralCookie,
  resolveActiveReferralCode,
  serializeReferralCookie,
  shouldSetFirstTouchReferral,
} from "@/lib/referral";

function readCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    return decodeURIComponent(trimmed.slice(name.length + 1));
  }
  return undefined;
}

/**
 * Creator referral entry: /r/[code]
 * Sets first-touch cookie (never overwrites an existing referral cookie), then redirects to signup.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await resolveActiveReferralCode(code);
  const url = new URL(request.url);
  const dest = new URL(row ? "/signup" : "/schedule", url.origin);
  if (row) dest.searchParams.set("ref", row.code);
  else dest.searchParams.set("refError", "1");

  const res = NextResponse.redirect(dest);
  if (!row) return res;

  const existing = parseReferralCookie(readCookieFromHeader(request.headers.get("cookie"), REFERRAL_COOKIE));
  if (shouldSetFirstTouchReferral(existing)) {
    res.cookies.set(
      REFERRAL_COOKIE,
      serializeReferralCookie({
        code: row.code,
        creatorId: row.creatorId,
        setAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
      },
    );
  }
  return res;
}
