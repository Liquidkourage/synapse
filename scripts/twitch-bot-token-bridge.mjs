/**
 * Same validate + refresh strategy as src/lib/twitch-bot-token.ts (Node bridge has no TS import).
 * @returns {Promise<string|null>} bare access token (no oauth: prefix)
 */

const MARGIN_MS = 5 * 60 * 1000;

/** @type {{ accessToken: string; expiresAt: number } | null} */
let cache = null;

function bearerToken(raw) {
  const t = raw.trim();
  if (t.toLowerCase().startsWith("oauth:")) return t.slice(6);
  return t;
}

async function validate(accessToken) {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function refreshAccessToken() {
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
    console.error(
      "[twitch-bot-token-bridge] refresh failed",
      res.status,
      (await res.text()).slice(0, 200),
    );
    return null;
  }

  const data = await res.json();
  if (data.refresh_token) {
    console.warn(
      "[twitch-bot-token-bridge] Twitch issued a new refresh_token — update TWITCH_BOT_REFRESH_TOKEN in Railway.",
    );
  }
  return data;
}

export async function getBareAccessTokenForIrc() {
  const now = Date.now();
  if (cache && cache.expiresAt - MARGIN_MS > now) {
    return cache.accessToken;
  }

  const raw = process.env.TWITCH_BOT_OAUTH?.trim();
  if (!raw) return null;

  let accessToken = bearerToken(raw);
  let val = await validate(accessToken);

  if (val?.expires_in != null && val.client_id && val.user_id) {
    const expAt = now + val.expires_in * 1000;
    if (expAt - MARGIN_MS > now) {
      cache = { accessToken, expiresAt: expAt };
      return accessToken;
    }
  }

  const refreshed = await refreshAccessToken();
  if (refreshed?.access_token) {
    accessToken = bearerToken(refreshed.access_token);
    val = await validate(accessToken);
    if (!val?.expires_in) {
      console.error("[twitch-bot-token-bridge] validate failed after refresh");
      return null;
    }
    cache = { accessToken, expiresAt: Date.now() + val.expires_in * 1000 };
    return accessToken;
  }

  if (val?.client_id && val.user_id && val.expires_in != null) {
    cache = { accessToken, expiresAt: Date.now() + val.expires_in * 1000 };
    return accessToken;
  }

  return null;
}
