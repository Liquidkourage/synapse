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

export const ZOOM_OAUTH_SCOPES = [
  "user:read:user",
  "meeting:write:meeting",
  "meeting:update:meeting",
  "meeting:read:meeting",
].join(" ");
