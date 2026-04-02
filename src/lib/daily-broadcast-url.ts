import type { Session } from "next-auth";
import { ensureDailyRoomOwnerOnlyBroadcast, isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";

const DAILY_TOKENS = "https://api.daily.co/v1/meeting-tokens";

/** Path segment after domain, e.g. https://x.daily.co/my-room → my-room */
export function roomNameFromDailyRoomUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "daily.co" && !u.hostname.endsWith(".daily.co")) return null;
    const seg = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    return seg[0] ?? null;
  } catch {
    return null;
  }
}

function appendTokenToDailyUrl(roomUrl: string, token: string): string {
  const u = new URL(roomUrl);
  u.searchParams.set("t", token);
  return u.toString();
}

function canPublishVideo(
  event: { hostId: string; producerId: string | null },
  session: Session | null,
): boolean {
  const uid = session?.user?.id;
  if (!uid) return false;
  return uid === event.hostId;
}

/**
 * In streaming mode, never hand viewers the raw Daily room URL — it allows full camera/mic join.
 * Use null so the UI can show an error; only the host may fall back to `base` when tokens fail.
 */
function streamingViewerUrlOrNull(
  publish: boolean,
  streaming: boolean,
  isDaily: boolean,
  base: string,
): string | null {
  if (!streaming || !isDaily || publish) {
    return base;
  }
  return null;
}

/**
 * Resolves the iframe `src` for Synapse video: streaming mode mints Daily tokens so only the host
 * publishes; others get receive-only. Falls back to the stored URL if not Daily or no API key.
 */
export async function resolveDailyBroadcastEmbedUrl(
  event: {
    broadcastEmbedUrl: string | null;
    broadcastHostOnlyJoin?: boolean | null;
    broadcastStreamingMode?: boolean | null;
    hostId: string;
    producerId: string | null;
  },
  session: Session | null,
): Promise<string | null> {
  const base = event.broadcastEmbedUrl;
  if (!base) return null;

  const hostOnly = event.broadcastHostOnlyJoin ?? false;
  const streaming = event.broadcastStreamingMode ?? true;

  try {
    if (
      !canViewBroadcastEmbed(
        {
          hostId: event.hostId,
          producerId: event.producerId,
          broadcastHostOnlyJoin: hostOnly,
        },
        session,
      )
    ) {
      return null;
    }

    const isDaily = isDailyNativeBroadcastUrl(base);

    if (!streaming || !isDaily) {
      return base;
    }

    const key = process.env.DAILY_API_KEY?.trim();
    const roomName = roomNameFromDailyRoomUrl(base);
    const publish = canPublishVideo(event, session);

    if (!key || !roomName) {
      return streamingViewerUrlOrNull(publish, streaming, isDaily, base);
    }

    /** Daily Prebuilt defaults to a full camera/mic lobby for all peers unless the room is in owner-only broadcast mode. */
    await ensureDailyRoomOwnerOnlyBroadcast(roomName);

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const display =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      (publish ? "Host" : "Viewer");

    /** Per-token Prebuilt UI — see https://docs.daily.co/reference/rest-api/meeting-tokens/config */
    const properties: Record<string, unknown> = {
      room_name: roomName,
      exp,
      user_name: display,
      is_owner: publish,
      enable_prejoin_ui: publish,
      start_video_off: !publish,
      start_audio_off: !publish,
      enable_screenshare: publish,
      enable_recording_ui: publish,
    };

    if (!publish) {
      properties.permissions = { canSend: false };
      /** Only documented on meeting tokens; hides CC tray button for viewers. */
      properties.enable_live_captions_ui = false;
    }

    const res = await fetch(DAILY_TOKENS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      console.error("[daily-broadcast-url] token error", rawBody);
      return streamingViewerUrlOrNull(publish, streaming, isDaily, base);
    }

    let data: { token?: string };
    try {
      data = rawBody ? (JSON.parse(rawBody) as { token?: string }) : {};
    } catch {
      console.error("[daily-broadcast-url] invalid JSON from Daily", rawBody.slice(0, 200));
      return streamingViewerUrlOrNull(publish, streaming, isDaily, base);
    }

    if (!data.token) {
      return streamingViewerUrlOrNull(publish, streaming, isDaily, base);
    }

    try {
      return appendTokenToDailyUrl(base, data.token);
    } catch (e) {
      console.error("[daily-broadcast-url] append token failed", e);
      return streamingViewerUrlOrNull(publish, streaming, isDaily, base);
    }
  } catch (e) {
    console.error("[daily-broadcast-url] unexpected", e);
    const isDaily = isDailyNativeBroadcastUrl(event.broadcastEmbedUrl ?? "");
    const publish = canPublishVideo(event, session);
    const streaming = event.broadcastStreamingMode ?? true;
    return streamingViewerUrlOrNull(publish, streaming, isDaily, event.broadcastEmbedUrl ?? "");
  }
}
