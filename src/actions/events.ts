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
import { revalidateEventPublicPaths } from "@/lib/event-page-path";
import { importPodcastShow, PodcastImportError, shouldBulkImportPodcast } from "@/lib/podcast-import";

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
  videoRoomMode: z.enum(["streaming", "open"]).optional(),
  integrationType: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  instructions: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
  coverImageUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  bannerImageUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  replayUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  podcastEmbedUrl: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  resultsSummary: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
  recurrenceNote: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  producerId: z.preprocess(emptyToUndef, z.string().optional()),
  twitchChannelLogin: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  venmoHandle: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  eventKind: z.enum(["LIVE_INTERACTIVE", "PODCAST"]).optional(),
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

  const broadcastStreamingMode = (parsed.data.videoRoomMode ?? "streaming") === "streaming";
  const eventKind = (parsed.data.eventKind ?? "LIVE_INTERACTIVE") as EventKind;

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
      broadcastEmbedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastHostOnlyJoin: eventKind === "PODCAST" ? false : (parsed.data.broadcastHostOnlyJoin ?? false),
      broadcastStreamingMode,
      integrationType: eventKind === "PODCAST" ? null : parsed.data.integrationType || null,
      instructions: eventKind === "PODCAST" ? null : parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.replayUrl) ?? null,
      podcastEmbedUrl: ensureHttpUrl(parsed.data.podcastEmbedUrl) ?? null,
      resultsSummary: eventKind === "PODCAST" ? null : parsed.data.resultsSummary || null,
      recurrenceNote: eventKind === "PODCAST" ? null : parsed.data.recurrenceNote || null,
      twitchChannelLogin:
        eventKind === "PODCAST" ? null : parsed.data.twitchChannelLogin?.trim().toLowerCase() || null,
      venmoHandle: eventKind === "PODCAST" ? null : normalizeVenmoHandle(parsed.data.venmoHandle ?? null) ?? null,
      eventKind,
    },
  });

  const { autoRoomOnCreate } = getSynapseVideoServerHints();
  if (eventKind === "LIVE_INTERACTIVE" && autoRoomOnCreate && !parsed.data.broadcastEmbedUrl?.trim()) {
    const r = await provisionDailyRoomForEvent(created.id);
    if (!r.ok) {
      console.error("[synapse-video] Auto-provision on create failed:", r.error);
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

  const broadcastStreamingMode = (parsed.data.videoRoomMode ?? "streaming") === "streaming";
  const eventKind = (parsed.data.eventKind ?? "LIVE_INTERACTIVE") as EventKind;

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

  await prisma.event.update({
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
      broadcastEmbedUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastHostOnlyJoin: eventKind === "PODCAST" ? false : (parsed.data.broadcastHostOnlyJoin ?? false),
      broadcastStreamingMode,
      integrationType: eventKind === "PODCAST" ? null : parsed.data.integrationType || null,
      instructions: eventKind === "PODCAST" ? null : parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: eventKind === "PODCAST" ? null : ensureHttpUrl(parsed.data.replayUrl) ?? null,
      podcastEmbedUrl: ensureHttpUrl(parsed.data.podcastEmbedUrl) ?? null,
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

  revalidatePath("/host/events");
  revalidateEventPublicPaths(revalidatePath, existing);
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
    await tx.siteSettings.updateMany({
      where: { featuredLiveEventId: eventId },
      data: { featuredLiveEventId: null },
    });

    const customBlocks = await tx.homepageBlock.findMany({
      where: { blockType: "custom_events", payload: { not: null } },
    });
    for (const b of customBlocks) {
      if (!b.payload) continue;
      try {
        const ids = JSON.parse(b.payload) as unknown;
        if (!Array.isArray(ids)) continue;
        const next = ids.filter((id) => id !== eventId);
        if (next.length !== ids.length) {
          await tx.homepageBlock.update({
            where: { id: b.id },
            data: { payload: next.length ? JSON.stringify(next) : null },
          });
        }
      } catch {
        /* ignore malformed payload */
      }
    }

    await tx.archiveEntry.updateMany({
      where: { eventId },
      data: { eventId: null },
    });

    await tx.event.delete({ where: { id: eventId } });
  });

  revalidatePath("/host/events");
  revalidateEventPublicPaths(revalidatePath, existing);
  revalidatePath("/schedule");
  revalidatePath("/live");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/admin");
  revalidatePath("/admin/homepage");

  return { ok: true };
}
