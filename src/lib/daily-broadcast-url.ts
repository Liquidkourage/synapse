import type { Session } from "next-auth";
import { dailyVideoModeFromEvent } from "@/lib/daily-video-mode";
import { ensureDailyStageRoom, stageRoomUrlFromMainRoomUrl } from "@/lib/daily-stage-room";
import { ensureDailyRoomConfig, isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
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

function isRoomOwner(event: { hostId: string }, session: Session | null): boolean {
  const uid = session?.user?.id;
  if (!uid) return false;
  return uid === event.hostId;
}

export type DailyBroadcastEmbedResult =
  | { layout: "single"; src: string | null }
  | { layout: "breakout-dual"; stageSrc: string | null; meetingSrc: string | null };

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

type DailyEventForEmbed = {
  broadcastEmbedUrl: string | null;
  broadcastHostOnlyJoin?: boolean | null;
  broadcastStreamingMode?: boolean | null;
  broadcastBreakoutsEnabled?: boolean | null;
  hostId: string;
  producerId: string | null;
};

async function mintDailyEmbedUrl(
  roomUrl: string,
  roomName: string,
  opts: {
    display: string;
    owner: boolean;
    publish: boolean;
    watchOnly: boolean;
  },
): Promise<string | null> {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) return null;

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const properties: Record<string, unknown> = {
    room_name: roomName,
    exp,
    user_name: opts.display,
    is_owner: opts.owner,
    enable_prejoin_ui: true,
    start_video_off: !opts.publish,
    start_audio_off: !opts.publish,
    enable_screenshare: opts.owner,
    enable_recording_ui: opts.owner,
  };

  if (opts.watchOnly) {
    properties.permissions = { canSend: false };
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
    console.error("[daily-broadcast-url] token error", roomName, rawBody);
    return null;
  }

  let data: { token?: string };
  try {
    data = rawBody ? (JSON.parse(rawBody) as { token?: string }) : {};
  } catch {
    console.error("[daily-broadcast-url] invalid JSON from Daily", rawBody.slice(0, 200));
    return null;
  }

  if (!data.token) return null;

  try {
    return appendTokenToDailyUrl(roomUrl, data.token);
  } catch (e) {
    console.error("[daily-broadcast-url] append token failed", e);
    return null;
  }
}

/** Host-only Daily stage embed (streaming / owner broadcast) for Zoom breakout dual layout. */
export async function resolveZoomHostStageEmbedUrl(
  stageRoomUrl: string | null,
  displayName: string,
): Promise<string | null> {
  if (!stageRoomUrl) return null;
  const roomName = roomNameFromDailyRoomUrl(stageRoomUrl);
  if (!roomName) return null;
  return mintDailyEmbedUrl(stageRoomUrl, roomName, {
    display: displayName,
    owner: true,
    publish: true,
    watchOnly: false,
  });
}

/**
 * Resolves iframe URL(s) for Synapse video. Breakout events use a pinned host stage (always visible)
 * plus the meeting room where teams join breakouts.
 */
export async function resolveDailyBroadcastEmbeds(
  event: DailyEventForEmbed,
  session: Session | null,
): Promise<DailyBroadcastEmbedResult | null> {
  const base = event.broadcastEmbedUrl;
  if (!base) return null;

  const hostOnly = event.broadcastHostOnlyJoin ?? false;
  const mode = dailyVideoModeFromEvent(event);
  const streaming = mode === "streaming";
  const breakouts = mode === "breakouts";

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

    if (!isDailyNativeBroadcastUrl(base)) {
      return { layout: "single", src: base };
    }

    const key = process.env.DAILY_API_KEY?.trim();
    const roomName = roomNameFromDailyRoomUrl(base);
    const publish = canPublishVideo(event, session);
    const owner = isRoomOwner({ hostId: event.hostId }, session);

    if (!key || !roomName) {
      return {
        layout: "single",
        src: streamingViewerUrlOrNull(publish, streaming, true, base),
      };
    }

    await ensureDailyRoomConfig(roomName, mode);

    const display =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      (owner ? "Host" : "Guest");

    if (!breakouts) {
      const src = await mintDailyEmbedUrl(base, roomName, {
        display,
        owner,
        publish,
        watchOnly: streaming && !owner,
      });
      if (src) return { layout: "single", src };
      return {
        layout: "single",
        src: streamingViewerUrlOrNull(publish, streaming, true, base),
      };
    }

    const stageUrl = (await ensureDailyStageRoom(base)) ?? stageRoomUrlFromMainRoomUrl(base);
    const stageName = stageUrl ? roomNameFromDailyRoomUrl(stageUrl) : null;
    if (!stageUrl || !stageName) {
      const src = await mintDailyEmbedUrl(base, roomName, {
        display,
        owner,
        publish,
        watchOnly: false,
      });
      return { layout: "single", src: src ?? base };
    }

    const [stageSrc, meetingSrc] = await Promise.all([
      mintDailyEmbedUrl(stageUrl, stageName, {
        display: owner ? "Host (stage)" : "Host",
        owner,
        publish: owner,
        watchOnly: !owner,
      }),
      mintDailyEmbedUrl(base, roomName, {
        display: owner ? "Host (breakouts)" : display,
        owner,
        publish,
        watchOnly: false,
      }),
    ]);

    return {
      layout: "breakout-dual",
      stageSrc: stageSrc ?? (owner ? stageUrl : null),
      meetingSrc: meetingSrc ?? (publish ? base : null),
    };
  } catch (e) {
    console.error("[daily-broadcast-url] unexpected", e);
    const publish = canPublishVideo(event, session);
    const streaming = dailyVideoModeFromEvent(event) === "streaming";
    return {
      layout: "single",
      src: streamingViewerUrlOrNull(publish, streaming, true, event.broadcastEmbedUrl ?? ""),
    };
  }
}

/** @deprecated Prefer resolveDailyBroadcastEmbeds for breakout-aware layouts. */
export async function resolveDailyBroadcastEmbedUrl(
  event: DailyEventForEmbed,
  session: Session | null,
): Promise<string | null> {
  const resolved = await resolveDailyBroadcastEmbeds(event, session);
  if (!resolved) return null;
  if (resolved.layout === "single") return resolved.src;
  return resolved.meetingSrc ?? resolved.stageSrc;
}
