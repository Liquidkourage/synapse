import { getZoomAccessTokenForUser } from "@/lib/zoom-tokens";

type ZoomUserSettingsResponse = {
  in_meeting?: Record<string, unknown>;
};

const BROADCAST_VOICE_KEY =
  /broadcast.*voice.*breakout|breakout.*broadcast.*voice|broadcast_voice.*breakout|voice.*breakout.*broadcast/i;

function pickBroadcastVoiceField(inMeeting: Record<string, unknown>): string | null {
  for (const key of Object.keys(inMeeting)) {
    if (BROADCAST_VOICE_KEY.test(key)) return key;
  }
  return null;
}

/** Enable breakout rooms (+ broadcast voice field if Zoom returns one) on the host's Zoom user. */
export async function ensureZoomBreakoutHostDefaults(
  hostUserId: string,
): Promise<{ ok: true; patched: string[] } | { ok: false; reason: "not_connected" | "api_error"; detail?: string }> {
  const accessToken = await getZoomAccessTokenForUser(hostUserId);
  if (!accessToken) return { ok: false, reason: "not_connected" };

  const getRes = await fetch("https://api.zoom.us/v2/users/me/settings", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const getRaw = await getRes.text();
  if (!getRes.ok) {
    console.warn("[zoom-user-settings] GET settings failed", getRes.status, getRaw.slice(0, 300));
    return { ok: false, reason: "api_error", detail: getRaw.slice(0, 300) };
  }

  let settings: ZoomUserSettingsResponse;
  try {
    settings = JSON.parse(getRaw) as ZoomUserSettingsResponse;
  } catch {
    return { ok: false, reason: "api_error", detail: "Invalid JSON from Zoom settings API." };
  }

  const inMeeting = settings.in_meeting ?? {};
  const patch: Record<string, unknown> = {};
  const patched: string[] = [];

  if (inMeeting.breakout_room !== true) {
    patch.breakout_room = true;
    patched.push("breakout_room");
  }

  const voiceKey = pickBroadcastVoiceField(inMeeting);
  if (voiceKey && inMeeting[voiceKey] !== true) {
    patch[voiceKey] = true;
    patched.push(voiceKey);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, patched: [] };
  }

  const patchRes = await fetch("https://api.zoom.us/v2/users/me/settings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ in_meeting: patch }),
  });

  if (!patchRes.ok) {
    const patchRaw = await patchRes.text();
    console.warn("[zoom-user-settings] PATCH settings failed", patchRes.status, patchRaw.slice(0, 300));
    return { ok: false, reason: "api_error", detail: patchRaw.slice(0, 300) };
  }

  return { ok: true, patched };
}
