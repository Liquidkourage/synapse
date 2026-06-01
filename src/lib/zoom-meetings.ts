import { prisma } from "@/lib/prisma";
import { getZoomAccessTokenForUser } from "@/lib/zoom-tokens";

type ZoomMeetingCreateResponse = {
  id: number | string;
  join_url: string;
  start_url: string;
  password?: string;
};

function formatZoomStartTime(iso: Date, timeZone: string): string {
  // Zoom expects local wall time in the given timezone, ISO-like without Z
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(iso);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export type FetchZoomZakResult =
  | { ok: true; token: string }
  | { ok: false; reason: "not_connected" | "zak_denied" | "zak_failed"; detail?: string };

export function zoomZakErrorMessage(result: Extract<FetchZoomZakResult, { ok: false }>): string {
  switch (result.reason) {
    case "not_connected":
      return "Connect your Zoom account in Host Settings → Zoom, then reload.";
    case "zak_denied":
      return (
        "Zoom is connected but Synapse cannot obtain a host token (ZAK). " +
        "In the Zoom Marketplace app for this site, enable the user:read:zak scope, save the app, " +
        "then use Disconnect and Connect again on this page."
      );
    default:
      return "Could not obtain a Zoom host token. Try disconnecting and reconnecting Zoom, then reload.";
  }
}

export async function fetchZoomHostZak(hostUserId: string): Promise<FetchZoomZakResult> {
  const token = await getZoomAccessTokenForUser(hostUserId);
  if (!token) {
    return { ok: false, reason: "not_connected" };
  }

  const endpoints = [
    "https://api.zoom.us/v2/users/me/token?type=zak",
    "https://api.zoom.us/v2/users/me/zak",
  ] as const;

  let lastDetail: string | undefined;

  for (const url of endpoints) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();

    if (res.ok) {
      try {
        const data = JSON.parse(body) as { token?: string };
        const zak = data.token?.trim();
        if (zak) return { ok: true, token: zak };
      } catch {
        lastDetail = body.slice(0, 200);
      }
      continue;
    }

    lastDetail = body.slice(0, 300);
    console.warn("[zoom-meetings] ZAK fetch failed", res.status, url, lastDetail);

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "zak_denied", detail: lastDetail };
    }
  }

  return { ok: false, reason: "zak_failed", detail: lastDetail };
}

/**
 * Creates or updates a Zoom meeting on the event host's account. Breakouts enabled when requested.
 */
export async function provisionZoomMeetingForEvent(
  eventId: string,
  opts: { breakouts: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found" };

  const accessToken = await getZoomAccessTokenForUser(event.hostId);
  if (!accessToken) {
    return {
      ok: false,
      error: "Event host has not connected Zoom. Connect Zoom in host settings first.",
    };
  }

  const durationMinutes = Math.max(
    15,
    Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60_000),
  );

  const body = {
    topic: event.title,
    type: 2,
    start_time: formatZoomStartTime(event.startAt, event.timezone),
    duration: durationMinutes,
    timezone: event.timezone,
    agenda: event.shortDescription.slice(0, 2000),
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      waiting_room: false,
      auto_recording: "none",
      focus_mode: true,
      breakout_room: {
        enable: opts.breakouts,
      },
    },
  };

  const isUpdate = !!event.zoomMeetingId;
  const url = isUpdate
    ? `https://api.zoom.us/v2/meetings/${event.zoomMeetingId}`
    : "https://api.zoom.us/v2/users/me/meetings";

  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: `Zoom API (${res.status}): ${raw.slice(0, 500)}` };
  }

  const data = JSON.parse(raw) as ZoomMeetingCreateResponse;
  const meetingNumber = String(data.id).replace(/\D/g, "");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      broadcastVideoProvider: "zoom",
      broadcastEmbedUrl: null,
      zoomMeetingId: String(data.id),
      zoomMeetingNumber: meetingNumber,
      zoomMeetingPasscode: data.password ?? event.zoomMeetingPasscode,
      zoomMeetingJoinUrl: data.join_url,
      zoomMeetingStartUrl: data.start_url,
      broadcastBreakoutsEnabled: opts.breakouts,
      broadcastStreamingMode: false,
      broadcastHostOnlyJoin: false,
    },
  });

  return { ok: true };
}

export function isZoomNativeEvent(event: {
  broadcastVideoProvider?: string | null;
  zoomMeetingNumber?: string | null;
}): boolean {
  return (
    event.broadcastVideoProvider === "zoom" ||
    !!(event.zoomMeetingNumber && event.zoomMeetingNumber.length > 0)
  );
}
