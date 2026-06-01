import { prisma } from "@/lib/prisma";
import { getZoomOAuthConfig } from "@/lib/zoom-config";

type ZoomTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

async function exchangeZoomToken(body: URLSearchParams): Promise<ZoomTokenResponse> {
  const { clientId, clientSecret } = getZoomOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Zoom OAuth is not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoom token error (${res.status}): ${text.slice(0, 400)}`);
  }

  return JSON.parse(text) as ZoomTokenResponse;
}

export async function saveZoomTokensForUser(
  userId: string,
  tokens: ZoomTokenResponse,
  profile?: { id?: string; email?: string },
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      zoomAccessToken: tokens.access_token,
      zoomRefreshToken: tokens.refresh_token ?? undefined,
      zoomTokenExpiresAt: expiresAt,
      zoomAccountId: profile?.id ?? undefined,
      zoomAccountEmail: profile?.email ?? undefined,
      zoomConnectedAt: new Date(),
    },
  });
}

export async function exchangeZoomCodeForTokens(code: string) {
  const { redirectUri } = getZoomOAuthConfig();
  if (!redirectUri) throw new Error("ZOOM_REDIRECT_URI or AUTH_URL required");

  return exchangeZoomToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
}

/** Returns a valid access token for the user, refreshing if needed. */
export async function getZoomAccessTokenForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      zoomAccessToken: true,
      zoomRefreshToken: true,
      zoomTokenExpiresAt: true,
    },
  });

  if (!user?.zoomAccessToken) return null;

  const expiresSoon =
    !user.zoomTokenExpiresAt || user.zoomTokenExpiresAt.getTime() < Date.now() + 60_000;

  if (!expiresSoon) return user.zoomAccessToken;

  if (!user.zoomRefreshToken) return null;

  try {
    const refreshed = await exchangeZoomToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.zoomRefreshToken,
      }),
    );
    await saveZoomTokensForUser(userId, refreshed);
    return refreshed.access_token;
  } catch (e) {
    console.error("[zoom-tokens] refresh failed", e);
    return null;
  }
}

export async function fetchZoomMe(accessToken: string) {
  const res = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Zoom users/me failed (${res.status})`);
  }
  return (await res.json()) as { id: string; email: string; first_name?: string; last_name?: string };
}

export async function disconnectZoomForUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      zoomAccessToken: null,
      zoomRefreshToken: null,
      zoomTokenExpiresAt: null,
      zoomAccountId: null,
      zoomAccountEmail: null,
      zoomConnectedAt: null,
    },
  });
}
