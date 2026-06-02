import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  exchangeZoomCodeForTokens,
  fetchZoomMe,
  saveZoomTokensForUser,
} from "@/lib/zoom-tokens";
import { ensureZoomBreakoutHostDefaults } from "@/lib/zoom-user-settings";

function baseUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/host/settings/zoom?error=${encodeURIComponent(error ?? "oauth_denied")}`, baseUrl()),
    );
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", baseUrl()));
  }

  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
        userId?: string;
      };
      if (parsed.userId && parsed.userId !== session.user.id) {
        return NextResponse.redirect(new URL("/host/settings/zoom?error=state_mismatch", baseUrl()));
      }
    } catch {
      /* ignore malformed state */
    }
  }

  try {
    const tokens = await exchangeZoomCodeForTokens(code);
    const me = await fetchZoomMe(tokens.access_token);
    await saveZoomTokensForUser(session.user.id, tokens, { id: me.id, email: me.email });
    void ensureZoomBreakoutHostDefaults(session.user.id).then((r) => {
      if (!r.ok) console.warn("[zoom-oauth] breakout defaults", r);
    });
    return NextResponse.redirect(new URL("/host/settings/zoom?connected=1", baseUrl()));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(`/host/settings/zoom?error=${encodeURIComponent(msg.slice(0, 200))}`, baseUrl()),
    );
  }
}
