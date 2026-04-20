/**
 * Twitch bot access token: validate + optional refresh (refresh_token grant).
 * Access tokens stay ~4h; refresh tokens are long-lived until revoked — this makes relay/IRC
 * keep working without manual TWITCH_BOT_OAUTH pastes.
 *
 * Env:
 *   TWITCH_BOT_OAUTH — current access token (or seed after first deploy)
 *   TWITCH_BOT_REFRESH_TOKEN — from OAuth token response (authorization code exchange)
 *   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET — Twitch app (same as dev console)
 */

const MARGIN_MS = 5 * 60 * 1000;

export function bearerToken(raw: string): string {
  const t = raw.trim();
  if (t.toLowerCase().startsWith("oauth:")) return t.slice(6);
  return t;
}

type ValidateJson = {
  client_id?: string;
  user_id?: string;
  expires_in?: number;
  scopes?: string[];
};

let cache: {
  accessToken: string;
  clientId: string;
  userId: string;
  expiresAt: number;
  scopes: string[];
} | null = null;

async function validate(accessToken: string): Promise<ValidateJson | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as ValidateJson;
}

async function refreshAccessToken(): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
} | null> {
  const refresh = process.env.TWITCH_BOT_REFRESH_TOKEN?.trim();
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!refresh || !clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error("[twitch-bot-token] refresh failed", res.status, (await res.text()).slice(0, 200));
    return null;
  }

  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

/**
 * Returns Helix-ready context; refreshes access token when expired or near expiry when refresh env is set.
 */
export async function getTwitchBotHelixContext(): Promise<{
  accessToken: string;
  clientId: string;
  userId: string;
  scopes: string[];
} | null> {
  const now = Date.now();
  if (cache && cache.expiresAt - MARGIN_MS > now) {
    return {
      accessToken: cache.accessToken,
      clientId: cache.clientId,
      userId: cache.userId,
      scopes: cache.scopes,
    };
  }

  const raw = process.env.TWITCH_BOT_OAUTH?.trim();
  if (!raw) return null;

  let accessToken = bearerToken(raw);
  let val = await validate(accessToken);

  if (val?.expires_in != null && val.client_id && val.user_id) {
    const expAt = now + val.expires_in * 1000;
    if (expAt - MARGIN_MS > now) {
      const scopes = Array.isArray(val.scopes) ? val.scopes : [];
      cache = {
        accessToken,
        clientId: val.client_id.trim(),
        userId: val.user_id.trim(),
        expiresAt: expAt,
        scopes,
      };
      return {
        accessToken,
        clientId: cache.clientId,
        userId: cache.userId,
        scopes,
      };
    }
  }

  const refreshed = await refreshAccessToken();
  if (refreshed?.access_token) {
    if (refreshed.refresh_token) {
      console.warn(
        "[twitch-bot-token] Twitch returned a new refresh_token. Update TWITCH_BOT_REFRESH_TOKEN in Railway to avoid losing refresh after deploy.",
      );
    }
    accessToken = bearerToken(refreshed.access_token);
    val = await validate(accessToken);
    if (!val?.client_id || !val.user_id || val.expires_in == null) {
      console.error("[twitch-bot-token] validate failed after refresh");
      return null;
    }
    const scopes = Array.isArray(val.scopes) ? val.scopes : [];
    cache = {
      accessToken,
      clientId: val.client_id.trim(),
      userId: val.user_id.trim(),
      expiresAt: Date.now() + val.expires_in * 1000,
      scopes,
    };
    return {
      accessToken,
      clientId: cache.clientId,
      userId: cache.userId,
      scopes,
    };
  }

  if (val?.client_id && val.user_id && val.expires_in != null) {
    const scopes = Array.isArray(val.scopes) ? val.scopes : [];
    cache = {
      accessToken,
      clientId: val.client_id.trim(),
      userId: val.user_id.trim(),
      expiresAt: Date.now() + val.expires_in * 1000,
      scopes,
    };
    return {
      accessToken,
      clientId: cache.clientId,
      userId: cache.userId,
      scopes,
    };
  }

  return null;
}
