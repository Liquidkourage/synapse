import { roomNameFromDailyRoomUrl } from "@/lib/daily-broadcast-url";

const DAILY_ROOMS = "https://api.daily.co/v1/rooms";
const STAGE_SUFFIX = "-stage";

/** Companion room for breakout events — host camera/mic; viewers watch-only. */
export function stageRoomNameFromMain(mainRoomName: string): string {
  const maxBase = 64 - STAGE_SUFFIX.length;
  return `${mainRoomName.slice(0, maxBase)}${STAGE_SUFFIX}`;
}

export function stageRoomUrlFromMainRoomUrl(mainRoomUrl: string): string | null {
  const mainName = roomNameFromDailyRoomUrl(mainRoomUrl);
  if (!mainName) return null;
  try {
    const u = new URL(mainRoomUrl);
    u.pathname = `/${stageRoomNameFromMain(mainName)}`;
    u.search = "";
    return u.toString();
  } catch {
    return null;
  }
}

function stageRoomProperties(cloudRecording: boolean) {
  return {
    enable_prejoin_ui: true,
    owner_only_broadcast: true,
    enable_breakout_rooms: false,
    enable_hand_raising: false,
    enable_emoji_reactions: false,
    enable_people_ui: true,
    ...(cloudRecording ? { enable_recording: "cloud" } : {}),
  };
}

/**
 * Creates or updates the host stage room paired with a breakout meeting room.
 */
export async function ensureDailyStageRoom(mainRoomUrl: string): Promise<string | null> {
  const key = process.env.DAILY_API_KEY?.trim();
  const stageUrl = stageRoomUrlFromMainRoomUrl(mainRoomUrl);
  const stageName = stageUrl ? roomNameFromDailyRoomUrl(stageUrl) : null;
  if (!key || !stageUrl || !stageName) return null;

  const cloudRecording = process.env.SYNAPSE_DAILY_CLOUD_RECORDING !== "false";
  const props = stageRoomProperties(cloudRecording);

  const getRes = await fetch(`${DAILY_ROOMS}/${encodeURIComponent(stageName)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (getRes.status === 404) {
    const createRes = await fetch(DAILY_ROOMS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: stageName, properties: props }),
    });
    if (!createRes.ok) {
      console.warn("[daily-stage-room] create failed", stageName, await createRes.text());
      return stageUrl;
    }
    return stageUrl;
  }

  if (!getRes.ok) {
    console.warn("[daily-stage-room] lookup failed", stageName, getRes.status);
    return stageUrl;
  }

  const syncRes = await fetch(`${DAILY_ROOMS}/${encodeURIComponent(stageName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: props }),
  });
  if (!syncRes.ok) {
    console.warn("[daily-stage-room] sync failed", stageName, await syncRes.text());
  }

  return stageUrl;
}
