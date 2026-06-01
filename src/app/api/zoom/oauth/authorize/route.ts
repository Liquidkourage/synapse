import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isHostOrAbove } from "@/lib/rbac";
import { getZoomOAuthConfig, ZOOM_OAUTH_SCOPES } from "@/lib/zoom-config";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    return NextResponse.redirect(new URL("/login", process.env.AUTH_URL ?? "http://localhost:3000"));
  }

  const { clientId, redirectUri, configured } = getZoomOAuthConfig();
  if (!configured || !clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL("/host/settings/zoom?error=not_configured", process.env.AUTH_URL ?? "http://localhost:3000"),
    );
  }

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, ts: Date.now() }),
  ).toString("base64url");

  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", ZOOM_OAUTH_SCOPES);

  return NextResponse.redirect(url.toString());
}
