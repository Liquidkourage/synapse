"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { EventStatus } from "@/generated/prisma";
import { z } from "zod";
import { isHostOrAbove, isProducerOrAbove } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { getSynapseVideoServerHints, provisionDailyRoomForEvent } from "@/lib/synapse-video";
import { ensureHttpUrl } from "@/lib/url";
import { normalizeVenmoHandle } from "@/lib/venmo-url";
import {
  addDurationToStart,
  assertValidIanaTimeZone,
  parseDurationHhMm,
  parseEventStartInTimeZone,
} from "@/lib/event-schedule";
import type { EventKind } from "@/generated/prisma";
import { parseVideoRoomModeForm } from "@/lib/daily-video-mode";
import { parseBroadcastVideoProviderForm } from "@/lib/broadcast-video-provider";
import { parseBreakoutTeamNamesFromForm } from "@/lib/breakout-teams";
import { provisionZoomMeetingForEvent } from "@/lib/zoom-meetings";
import { roomNameFromDailyRoomUrl } from "@/lib/daily-broadcast-url";
import { deleteEventsCleanup } from "@/lib/event-delete";
import { revalidateEventPublicPaths } from "@/lib/event-page-path";
import { ensureDailyRoomConfig, isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { dailyVideoModeFromEvent } from "@/lib/daily-video-mode";
import { importPodcastShow, PodcastImportError, shouldBulkImportPodcast } from "@/lib/podcast-import";
import { looksLikeRssFeedUrl } from "@/lib/podcast-url";

const emptyToUndef = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const eventFields = z.object({
  title: z.string().min(2).max(200),
  shortDescription: z.string().min(1).max(500),
  longDescription: z.preprocess(emptyToUndef, z.string().max(10000).optional()),
  startAt: z.string(),
  /** Hours:minutes length, e.g. 2:30 or 02:30 */
  duration: z.string().min(1).max(32),
  timezone: z.string().default("America/New_York"),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"]),
  statusOverride: z.preprocess(
    emptyToUndef,
    z.enum(["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"]).optional(),
  ),
  platformName: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  externalUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  embedUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  secondaryEmbedUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  broadcastEmbedUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  broadcastHostOnlyJoin: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean().optional()),
  videoRoomMode: z.enum(["streaming", "open", "breakouts"]).optional(),
  broadcastVideoProvider: z.enum(["daily", "zoom", "custom"]).optional(),
  integrationType: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  instructions: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
  coverImageUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  bannerImageUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  replayUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  podcastEmbedUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  podcastShowTitle: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  resultsSummary: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
  recurrenceNote: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  producerId: z.preprocess(emptyToUndef, z.string().optional()),
  twitchChannelLogin: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  venmoHandle: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  eventKind: z.enum(["LIVE_INTERACTIVE", "PODCAST"]).optional(),
  breakoutTeamNames: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
}).superRefine((data, ctx) => {
  const kind = data.eventKind ?? "LIVE_INTERACTIVE";
  if (kind === "PODCAST" && !data.podcastEmbedUrl?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Podcast episodes need a show link, episode link, RSS feed, or audio file URL.",
      path: ["podcastEmbedUrl"],
    });
  }
});

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return eventFields.safeParse(raw);
}

export async function createEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    return;
  }
  const parsed = parseForm(formData);
  if (!parsed.success) return;

  const videoMode = parseVideoRoomModeForm(parsed.data.videoRoomMode);
  const broadcastBreakoutsEnabled = videoMode === "breakouts";
  const broadcastStreamingMode = videoMode === "streaming";
  const broadcastVideoProvider = parseBroadcastVideoProviderForm(parsed.data.broadcastVideoProvider);
  const eventKind = (parsed.data.eventKind ?? "LIVE_INTERACTIVE") as EventKind;
  const breakoutTeamNames =
    eventKind !== "PODCAST" && broadcastBreakoutsEnabled
      ? parseBreakoutTeamNamesFromForm(parsed.data.breakoutTeamNames)
      : [];

  const hostId =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? (formData.get("hostId") as string) || session.user.id
      : session.user.id;

  const tz = parsed.data.timezone.trim();
  const durationInput = eventKind === "PODCAST" ? "0:15" : parsed.data.duration;
  const status =
    eventKind === "PODCAST"
      ? ((parsed.data.status as EventStatus | undefined) ?? "COMPLETED")
      : (parsed.data.status as EventStatus);
  let startAt: Date;
  let endAt: Date;
  try {
    assertValidIanaTimeZone(tz);
    startAt = parseEventStartInTimeZone(parsed.data.startAt, tz);
    endAt = addDurationToStart(startAt, parseDurationHhMm(durationInput));
  } catch (e) {
    console.error("[createEvent] Invalid schedule:", e);
    return;
  }

  const podcastUrl = eventKind === "PODCAST" ? ensureHttpUrl(parsed.data.podcastEmbedUrl) : null;
  if (eventKind === "PODCAST" && podcastUrl && shouldBulkImportPodcast(podcastUrl)) {
    try {
      const result = await importPodcastShow({
        feedOrShowUrl: podcastUrl,
        hostId,
        producerId: parsed.data.producerId || null,
        timezone: tz,
        status,
        showTitleFallback: parsed.data.title,
        showDescriptionFallback: parsed.data.shortDescription,
        coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      });
      revalidatePath("/host/events");
      revalidatePath("/podcasts");
      revalidatePath("/podcasts/episodes");
      revalidatePath("/");
      const q = new URLSearchParams({
        podcastImported: String(result.created),
        podcastSkipped: String(result.skipped),
        show: result.showTitle,
      });
      redirect(`/host/events?${q.toString()}`);
    } catch (e) {
      if (e instanceof PodcastImportError) {
        redirect(`/host/events/new?podcastError=${encodeURIComponent(e.message)}`);
      }
      throw e;
    }
  }

  if (eventKind === "PODCAST" && podcastUrl && looksLikeRssFeedUrl(podcastUrl)) {
    redirect(
      `/host/events/new?podcastError=${encodeURIComponent("Could not import episodes from that feed. Check the URL is reachable and try again.")}`,
    );
  }

  const slugBase = slugify(parsed.data.title);
  let slug = slugBase;
  let n = 0;
  while (await prisma.event.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }

  const created = await prisma.event.create({
    data: {
      slug,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription || null,
      startAt,
      endAt,
      timezone: tz,
      status,
      statusOverride:
        eventKind === "PODCAST"
          ? null
          : parsed.data.statusOverride
            ? (parsed.data.statusOverride as EventStatus)
            : null,
      hostId,
      producerId: parsed.data.producerId || null,
      platformName: eventKind === "PODCAST" ? null : parsed.data.platformName || null,
      externalUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.externalUrl) ?? null,
      embedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.embedUrl) ?? null,
      secondaryEmbedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.secondaryEmbedUrl) ?? null,
      broadcastEmbedUrl:
        eventKind === "PODCAST" || broadcastVideoProvider === "zoom"
          ? null
          : ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastVideoProvider: eventKind === "PODCAST" ? "daily" : broadcastVideoProvider,
      broadcastHostOnlyJoin:
        eventKind === "PODCAST" || broadcastBreakoutsEnabled || broadcastVideoProvider === "zoom"
          ? false
          : (parsed.data.broadcastHostOnlyJoin ?? false),
      broadcastStreamingMode: eventKind === "PODCAST" ? true : broadcastStreamingMode,
      broadcastBreakoutsEnabled: eventKind === "PODCAST" ? false : broadcastBreakoutsEnabled,
      breakoutTeamNames,
      integrationType: eventKind === "PODCAST" ? null : parsed.data.integrationType || null,
      instructions: eventKind === "PODCAST" ? null : parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.replayUrl) ?? null,
      podcastEmbedUrl: ensureHttpUrl(parsed.data.podcastEmbedUrl) ?? null,
      podcastShowTitle:
        eventKind === "PODCAST" ? parsed.data.podcastShowTitle?.trim() || null : null,
      resultsSummary: eventKind === "PODCAST" ? null : parsed.data.resultsSummary || null,
      recurrenceNote: eventKind === "PODCAST" ? null : parsed.data.recurrenceNote || null,
      twitchChannelLogin:
        eventKind === "PODCAST" ? null : parsed.data.twitchChannelLogin?.trim().toLowerCase() || null,
      venmoHandle: eventKind === "PODCAST" ? null : normalizeVenmoHandle(parsed.data.venmoHandle ?? null) ?? null,
      eventKind,
    },
  });

  const { autoRoomOnCreate } = getSynapseVideoServerHints();
  if (
    eventKind === "LIVE_INTERACTIVE" &&
    broadcastVideoProvider === "daily" &&
    autoRoomOnCreate &&
    !parsed.data.broadcastEmbedUrl?.trim()
  ) {
    const r = await provisionDailyRoomForEvent(created.id);
    if (!r.ok) {
      console.error("[synapse-video] Auto-provision on create failed:", r.error);
    }
  }

  if (eventKind === "LIVE_INTERACTIVE" && broadcastVideoProvider === "zoom") {
    const z = await provisionZoomMeetingForEvent(created.id, { breakouts: broadcastBreakoutsEnabled });
    if (!z.ok) {
      console.error("[zoom] Auto-provision on create failed:", z.error);
    }
  }

  revalidatePath("/host/events");
  revalidateEventPublicPaths(revalidatePath, created);
  revalidatePath("/schedule");
  revalidatePath("/live");
  revalidatePath("/");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) return;

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCER" ||
    (session.user.role === "HOST" && existing.hostId === session.user.id);

  if (!canEdit) return;

  const parsed = parseForm(formData);
  if (!parsed.success) return;

  const videoMode = parseVideoRoomModeForm(parsed.data.videoRoomMode);
  const broadcastBreakoutsEnabled = videoMode === "breakouts";
  const broadcastStreamingMode = videoMode === "streaming";
  const broadcastVideoProvider = parseBroadcastVideoProviderForm(parsed.data.broadcastVideoProvider);
  const eventKind = (parsed.data.eventKind ?? "LIVE_INTERACTIVE") as EventKind;
  const breakoutTeamNames =
    eventKind !== "PODCAST" && broadcastBreakoutsEnabled
      ? parseBreakoutTeamNamesFromForm(parsed.data.breakoutTeamNames)
      : [];

  const tz = parsed.data.timezone.trim();
  const durationInput = eventKind === "PODCAST" ? "0:15" : parsed.data.duration;
  const status =
    eventKind === "PODCAST"
      ? ((parsed.data.status as EventStatus | undefined) ?? "COMPLETED")
      : (parsed.data.status as EventStatus);
  let startAt: Date;
  let endAt: Date;
  try {
    assertValidIanaTimeZone(tz);
    startAt = parseEventStartInTimeZone(parsed.data.startAt, tz);
    endAt = addDurationToStart(startAt, parseDurationHhMm(durationInput));
  } catch (e) {
    console.error("[updateEvent] Invalid schedule:", e);
    return;
  }

  const podcastUrl = eventKind === "PODCAST" ? ensureHttpUrl(parsed.data.podcastEmbedUrl) : null;
  if (eventKind === "PODCAST" && podcastUrl && shouldBulkImportPodcast(podcastUrl)) {
    const hostId =
      session.user.role === "ADMIN" || session.user.role === "PRODUCER"
        ? (formData.get("hostId") as string) || existing.hostId
        : existing.hostId;

    try {
      const result = await importPodcastShow({
        feedOrShowUrl: podcastUrl,
        hostId,
        producerId: parsed.data.producerId || existing.producerId,
        timezone: tz,
        status,
        showTitleFallback: parsed.data.title,
        showDescriptionFallback: parsed.data.shortDescription,
        coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? existing.coverImageUrl,
      });

      if (looksLikeRssFeedUrl(existing.podcastEmbedUrl ?? "")) {
        await prisma.event.delete({ where: { id: eventId } });
      }

      revalidatePath("/host/events");
      revalidatePath("/podcasts");
      revalidatePath("/podcasts/episodes");
      revalidatePath("/");
      const q = new URLSearchParams({
        podcastImported: String(result.created),
        podcastSkipped: String(result.skipped),
        show: result.showTitle,
      });
      redirect(`/host/events?${q.toString()}`);
    } catch (e) {
      if (e instanceof PodcastImportError) {
        redirect(`/host/events/${eventId}/edit?podcastError=${encodeURIComponent(e.message)}`);
      }
      throw e;
    }
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      eventKind,
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription || null,
      startAt,
      endAt,
      timezone: tz,
      status,
      statusOverride:
        eventKind === "PODCAST"
          ? null
          : parsed.data.statusOverride
            ? (parsed.data.statusOverride as EventStatus)
            : null,
      platformName: eventKind === "PODCAST" ? null : parsed.data.platformName || null,
      externalUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.externalUrl) ?? null,
      embedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.embedUrl) ?? null,
      secondaryEmbedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.secondaryEmbedUrl) ?? null,
      broadcastEmbedUrl:
        eventKind === "PODCAST" || broadcastVideoProvider === "zoom"
          ? null
          : ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastVideoProvider: eventKind === "PODCAST" ? "daily" : broadcastVideoProvider,
      broadcastHostOnlyJoin:
        eventKind === "PODCAST" || broadcastBreakoutsEnabled || broadcastVideoProvider === "zoom"
          ? false
          : (parsed.data.broadcastHostOnlyJoin ?? false),
      broadcastStreamingMode: eventKind === "PODCAST" ? true : broadcastStreamingMode,
      broadcastBreakoutsEnabled: eventKind === "PODCAST" ? false : broadcastBreakoutsEnabled,
      breakoutTeamNames,
      ...(broadcastVideoProvider !== "zoom"
        ? {
            zoomMeetingId: null,
            zoomMeetingNumber: null,
            zoomMeetingPasscode: null,
            zoomMeetingJoinUrl: null,
            zoomMeetingStartUrl: null,
          }
        : {}),
      integrationType: eventKind === "PODCAST" ? null : parsed.data.integrationType || null,
      instructions: eventKind === "PODCAST" ? null : parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.replayUrl) ?? null,
      podcastEmbedUrl: ensureHttpUrl(parsed.data.podcastEmbedUrl) ?? null,
      podcastShowTitle:
        eventKind === "PODCAST" ? parsed.data.podcastShowTitle?.trim() || null : null,
      resultsSummary: eventKind === "PODCAST" ? null : parsed.data.resultsSummary || null,
      recurrenceNote: eventKind === "PODCAST" ? null : parsed.data.recurrenceNote || null,
      twitchChannelLogin:
        eventKind === "PODCAST" ? null : parsed.data.twitchChannelLogin?.trim().toLowerCase() || null,
      venmoHandle: eventKind === "PODCAST" ? null : normalizeVenmoHandle(parsed.data.venmoHandle ?? null) ?? null,
      ...(isProducerOrAbove(session.user.role) && parsed.data.producerId
        ? { producerId: parsed.data.producerId }
        : {}),
    },
  });

  if (eventKind === "LIVE_INTERACTIVE" && broadcastVideoProvider === "zoom") {
    const z = await provisionZoomMeetingForEvent(updated.id, { breakouts: broadcastBreakoutsEnabled });
    if (!z.ok) {
      console.error("[zoom] Provision on update failed:", z.error);
    }
  }

  if (
    eventKind !== "PODCAST" &&
    broadcastVideoProvider === "daily" &&
    updated.broadcastEmbedUrl &&
    isDailyNativeBroadcastUrl(updated.broadcastEmbedUrl)
  ) {
    const roomName = roomNameFromDailyRoomUrl(updated.broadcastEmbedUrl);
    if (roomName) {
      await ensureDailyRoomConfig(roomName, dailyVideoModeFromEvent(updated));
    }
  }

  if (
    eventKind === "PODCAST" &&
    existing.podcastFeedUrl &&
    parsed.data.podcastShowTitle?.trim()
  ) {
    await prisma.event.updateMany({
      where: { podcastFeedUrl: existing.podcastFeedUrl, hostId: existing.hostId },
      data: { podcastShowTitle: parsed.data.podcastShowTitle.trim() },
    });
    revalidatePath("/podcasts");
    revalidatePath(`/podcasts/shows/${existing.hostId}`);
  }

  revalidatePath("/host/events");
  revalidateEventPublicPaths(revalidatePath, updated);
  revalidatePath("/schedule");
  revalidatePath("/live");
  revalidatePath("/");
}

export async function createArchiveEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isProducerOrAbove(session.user.role)) {
    return;
  }
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;
  const slugBase = slugify(title);
  let slug = slugBase;
  let n = 0;
  while (await prisma.archiveEntry.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }
  await prisma.archiveEntry.create({
    data: {
      slug,
      title,
      description: (formData.get("description") as string) || null,
      videoUrl: ensureHttpUrl(emptyToUndef(formData.get("videoUrl"))) ?? null,
      thumbnailUrl: ensureHttpUrl(emptyToUndef(formData.get("thumbnailUrl"))) ?? null,
      externalUrl: ensureHttpUrl(emptyToUndef(formData.get("externalUrl"))) ?? null,
      eventId: (formData.get("eventId") as string) || null,
    },
  });
  revalidatePath("/archive");
  revalidatePath("/producer");
}

export async function deleteEvent(eventId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) return { ok: false, error: "Not found" };

  const canDelete =
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCER" ||
    (session.user.role === "HOST" && existing.hostId === session.user.id);

  if (!canDelete) return { ok: false, error: "Forbidden" };

  const slug = existing.slug;

  await prisma.$transaction(async (tx) => {
    await deleteEventsCleanup(tx, [eventId]);
  });

  revalidatePath("/host/events");
  revalidatePath("/host/podcasts");
  revalidateEventPublicPaths(revalidatePath, existing);
  revalidatePath("/schedule");
  revalidatePath("/live");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/admin");
  revalidatePath("/admin/homepage");

  return { ok: true };
}
