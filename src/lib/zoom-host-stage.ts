import { roomNameFromDailyRoomUrl } from "@/lib/daily-broadcast-url";
import { ensureDailyRoomConfig } from "@/lib/synapse-video";

const DAILY_ROOMS = "https://api.daily.co/v1/rooms";

function stageRoomNameForEvent(slug: string): string {
  const base = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `synapse-zoom-${base || "event"}-stage`.slice(0, 64);
}

/**
 * Host camera/mic stage for Zoom breakout shows (Daily streaming room).
 * Requires DAILY_API_KEY on the server.
 */
export async function ensureZoomHostStageRoom(eventSlug: string): Promise<string | null> {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) return null;

  const name = stageRoomNameForEvent(eventSlug);
  const cloudRecording = process.env.SYNAPSE_DAILY_CLOUD_RECORDING !== "false";
  const props = {
    enable_prejoin_ui: true,
    owner_only_broadcast: true,
    enable_breakout_rooms: false,
    enable_hand_raising: false,
    enable_emoji_reactions: false,
    enable_people_ui: true,
    ...(cloudRecording ? { enable_recording: "cloud" } : {}),
  };

  const getRes = await fetch(`${DAILY_ROOMS}/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (getRes.status === 404) {
    const createRes = await fetch(DAILY_ROOMS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, properties: props }),
    });
    if (!createRes.ok) {
      console.warn("[zoom-host-stage] create failed", name, await createRes.text());
      return `https://${name}.daily.co/${name}`;
    }
    const created = (await createRes.json()) as { url?: string };
    return created.url ?? `https://${name}.daily.co/${name}`;
  }

  if (!getRes.ok) {
    console.warn("[zoom-host-stage] lookup failed", name, getRes.status);
    return `https://${name}.daily.co/${name}`;
  }

  const existing = (await getRes.json()) as { url?: string };
  const url = existing.url ?? `https://${name}.daily.co/${name}`;

  await fetch(`${DAILY_ROOMS}/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: props }),
  });

  const roomName = roomNameFromDailyRoomUrl(url);
  if (roomName) await ensureDailyRoomConfig(roomName, "streaming");

  return url;
}
