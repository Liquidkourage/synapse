import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dailyVideoModeFromEvent, type DailyVideoMode } from "@/lib/daily-video-mode";

/** Built-in Synapse video uses Daily.co (free dev tier + pay-as-you-go). Docs: https://www.daily.co/pricing */
export const SYNAPSE_VIDEO_PROVIDER = "daily" as const;

const DAILY_ROOMS = "https://api.daily.co/v1/rooms";

/** Rooms we've already synced this process — POST is idempotent; bump version when sync payload changes. */
const ROOM_CONFIG_SYNC_VER = 3;
const roomConfigSynced = new Set<string>();

function roomPropertiesForMode(mode: DailyVideoMode, cloudRecording: boolean) {
  const base = {
    enable_prejoin_ui: true,
    enable_hand_raising: false,
    enable_emoji_reactions: false,
    ...(cloudRecording ? { enable_recording: "cloud" } : {}),
  };

  switch (mode) {
    case "breakouts":
      return {
        ...base,
        owner_only_broadcast: false,
        enable_breakout_rooms: true,
        enable_people_ui: true,
      };
    case "open":
      return {
        ...base,
        owner_only_broadcast: false,
        enable_breakout_rooms: false,
      };
    case "streaming":
    default:
      return {
        ...base,
        owner_only_broadcast: true,
        enable_breakout_rooms: false,
      };
  }
}

/**
 * Sync Daily room properties for streaming, open call, or breakout meetings.
 * @see https://docs.daily.co/reference/rest-api/rooms/set-room-config
 * @see https://www.daily.co/blog/daily-prebuilt-breakout-rooms-demo/
 */
export async function ensureDailyRoomConfig(roomName: string, mode: DailyVideoMode): Promise<void> {
  const key = process.env.DAILY_API_KEY?.trim();
  const cacheKey = `${roomName}::${mode}::v${ROOM_CONFIG_SYNC_VER}`;
  if (!key || roomConfigSynced.has(cacheKey)) return;

  const cloudRecording = process.env.SYNAPSE_DAILY_CLOUD_RECORDING !== "false";

  const res = await fetch(`${DAILY_ROOMS}/${encodeURIComponent(roomName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: roomPropertiesForMode(mode, cloudRecording),
    }),
  });

  if (res.ok) {
    roomConfigSynced.add(cacheKey);
    return;
  }
  const detail = await res.text();
  console.warn("[synapse-video] room config sync failed", mode, res.status, detail.slice(0, 400));
}

/** @deprecated Use ensureDailyRoomConfig(roomName, "streaming") */
export async function ensureDailyRoomOwnerOnlyBroadcast(roomName: string): Promise<void> {
  return ensureDailyRoomConfig(roomName, "streaming");
}

export function getSynapseVideoServerHints() {
  const key = process.env.DAILY_API_KEY?.trim();
  const nativeVideoAvailable = !!key;
  const autoRoomOnCreate =
    nativeVideoAvailable && process.env.SYNAPSE_VIDEO_AUTO_ROOM !== "false";
  return { nativeVideoAvailable, autoRoomOnCreate };
}

export function isDailyNativeBroadcastUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === "daily.co" || u.hostname.endsWith(".daily.co");
  } catch {
    return false;
  }
}

function revalidateAfterVideoUpdate(eventId: string, slug: string) {
  revalidatePath(`/host/events/${eventId}/edit`);
  revalidatePath(`/events/${slug}`);
  revalidatePath("/live");
  revalidatePath("/");
}

/**
 * Creates a Daily room and saves `broadcastEmbedUrl`. Caller must enforce auth (host/producer/admin).
 */
export async function provisionDailyRoomForEvent(
  eventId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Synapse video is not configured (set DAILY_API_KEY)" };
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { ok: false, error: "Event not found" };
  }

  const safe = event.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const name = `synapse-${safe}-${Date.now().toString(36)}`.slice(0, 64);

  const cloudRecording = process.env.SYNAPSE_DAILY_CLOUD_RECORDING !== "false";
  const mode = dailyVideoModeFromEvent(event);

  const res = await fetch(DAILY_ROOMS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      properties: roomPropertiesForMode(mode, cloudRecording),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, error: `Daily API error: ${detail}` };
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) {
    return { ok: false, error: "Daily response missing url" };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { broadcastEmbedUrl: data.url },
  });

  revalidateAfterVideoUpdate(event.id, event.slug);

  return { ok: true, url: data.url };
}
