/** Zoom OAuth + Meeting SDK (host-connected account). */

export function getZoomOAuthConfig() {
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.ZOOM_REDIRECT_URI?.trim() ||
    (process.env.AUTH_URL?.trim()
      ? `${process.env.AUTH_URL.replace(/\/$/, "")}/api/zoom/oauth/callback`
      : undefined);

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: !!(clientId && clientSecret && redirectUri),
  };
}

/** Meeting SDK credentials (General app with Meeting SDK enabled — usually same Client ID/Secret). */
export function getZoomMeetingSdkConfig() {
  const sdkKey = process.env.ZOOM_MEETING_SDK_KEY?.trim() || process.env.ZOOM_CLIENT_ID?.trim();
  const sdkSecret =
    process.env.ZOOM_MEETING_SDK_SECRET?.trim() || process.env.ZOOM_CLIENT_SECRET?.trim();
  return {
    sdkKey,
    sdkSecret,
    configured: !!(sdkKey && sdkSecret),
  };
}

/**
 * Must match scopes enabled on the Zoom Marketplace app.
 * Host join (ZAK): `user:read:zak` and `user:read:token` (Zoom requires the latter for GET …/token?type=zak).
 */
export const ZOOM_OAUTH_SCOPES = [
  "user:read:user",
  "user:read:zak",
  "user:read:token",
  "meeting:write:meeting",
  "meeting:update:meeting",
  "meeting:read:meeting",
].join(" ");
