import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Built-in Synapse video uses Daily.co (free dev tier + pay-as-you-go). Docs: https://www.daily.co/pricing */
export const SYNAPSE_VIDEO_PROVIDER = "daily" as const;

const DAILY_ROOMS = "https://api.daily.co/v1/rooms";

/** Rooms we've already synced this process — POST is idempotent; bump version when sync payload changes. */
const OWNER_BROADCAST_SYNC_VER = 2;
const ownerBroadcastSynced = new Set<string>();

/**
 * Daily "Owner only broadcast": only meeting owners (host token) may send camera/mic/screen; everyone else is audience.
 * Without this, Prebuilt shows the full camera/mic prejoin ("Are you ready to join?") to all participants.
 * @see https://www.daily.co/blog/daily-prebuilt-broadcast-call-deep-dive/
 */
export async function ensureDailyRoomOwnerOnlyBroadcast(roomName: string): Promise<void> {
  const key = process.env.DAILY_API_KEY?.trim();
  const cacheKey = `${roomName}::sync${OWNER_BROADCAST_SYNC_VER}`;
  if (!key || ownerBroadcastSynced.has(cacheKey)) return;

  const res = await fetch(`${DAILY_ROOMS}/${encodeURIComponent(roomName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        owner_only_broadcast: true,
        /** Room-level; affects everyone. Reduces tray clutter in Prebuilt (token cannot hide all tray controls). */
        enable_hand_raising: false,
        enable_emoji_reactions: false,
      },
    }),
  });

  if (res.ok) {
    ownerBroadcastSynced.add(cacheKey);
    return;
  }
  const detail = await res.text();
  console.warn("[synapse-video] owner_only_broadcast sync failed", res.status, detail.slice(0, 400));
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

  /** Cloud MP4 recording (pay-as-you-go on Daily). Set SYNAPSE_DAILY_CLOUD_RECORDING=false to skip. */
  const cloudRecording = process.env.SYNAPSE_DAILY_CLOUD_RECORDING !== "false";

  const res = await fetch(DAILY_ROOMS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      properties: {
        enable_prejoin_ui: true,
        /** Webinar-style: hosts use prejoin; viewers get audience UI (no full camera/mic lobby). */
        owner_only_broadcast: true,
        enable_hand_raising: false,
        enable_emoji_reactions: false,
        ...(cloudRecording ? { enable_recording: "cloud" } : {}),
      },
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
