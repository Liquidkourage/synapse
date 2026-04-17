"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { EventStatus } from "@/generated/prisma";
import { z } from "zod";
import { isHostOrAbove, isProducerOrAbove } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { getSynapseVideoServerHints, provisionDailyRoomForEvent } from "@/lib/synapse-video";
import { ensureHttpUrl } from "@/lib/url";

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
  endAt: z.string(),
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
  resultsSummary: z.preprocess(emptyToUndef, z.string().max(8000).optional()),
  recurrenceNote: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  producerId: z.preprocess(emptyToUndef, z.string().optional()),
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

  const hostId =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? (formData.get("hostId") as string) || session.user.id
      : session.user.id;

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
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      timezone: parsed.data.timezone,
      status: parsed.data.status as EventStatus,
      statusOverride: parsed.data.statusOverride ? (parsed.data.statusOverride as EventStatus) : null,
      hostId,
      producerId: parsed.data.producerId || null,
      platformName: parsed.data.platformName || null,
      externalUrl: ensureHttpUrl(parsed.data.externalUrl) ?? null,
      embedUrl: ensureHttpUrl(parsed.data.embedUrl) ?? null,
      secondaryEmbedUrl: ensureHttpUrl(parsed.data.secondaryEmbedUrl) ?? null,
      broadcastEmbedUrl: ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastHostOnlyJoin: parsed.data.broadcastHostOnlyJoin ?? false,
      broadcastStreamingMode,
      integrationType: parsed.data.integrationType || null,
      instructions: parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: ensureHttpUrl(parsed.data.replayUrl) ?? null,
      resultsSummary: parsed.data.resultsSummary || null,
      recurrenceNote: parsed.data.recurrenceNote || null,
    },
  });

  const { autoRoomOnCreate } = getSynapseVideoServerHints();
  if (autoRoomOnCreate && !parsed.data.broadcastEmbedUrl?.trim()) {
    const r = await provisionDailyRoomForEvent(created.id);
    if (!r.ok) {
      console.error("[synapse-video] Auto-provision on create failed:", r.error);
    }
  }

  revalidatePath("/host/events");
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

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription || null,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      timezone: parsed.data.timezone,
      status: parsed.data.status as EventStatus,
      statusOverride: parsed.data.statusOverride ? (parsed.data.statusOverride as EventStatus) : null,
      platformName: parsed.data.platformName || null,
      externalUrl: ensureHttpUrl(parsed.data.externalUrl) ?? null,
      embedUrl: ensureHttpUrl(parsed.data.embedUrl) ?? null,
      secondaryEmbedUrl: ensureHttpUrl(parsed.data.secondaryEmbedUrl) ?? null,
      broadcastEmbedUrl: ensureHttpUrl(parsed.data.broadcastEmbedUrl) ?? null,
      broadcastHostOnlyJoin: parsed.data.broadcastHostOnlyJoin ?? false,
      broadcastStreamingMode,
      integrationType: parsed.data.integrationType || null,
      instructions: parsed.data.instructions || null,
      coverImageUrl: ensureHttpUrl(parsed.data.coverImageUrl) ?? null,
      bannerImageUrl: ensureHttpUrl(parsed.data.bannerImageUrl) ?? null,
      replayUrl: ensureHttpUrl(parsed.data.replayUrl) ?? null,
      resultsSummary: parsed.data.resultsSummary || null,
      recurrenceNote: parsed.data.recurrenceNote || null,
      ...(isProducerOrAbove(session.user.role) && parsed.data.producerId
        ? { producerId: parsed.data.producerId }
        : {}),
    },
  });

  revalidatePath("/host/events");
  revalidatePath(`/events/${existing.slug}`);
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
  revalidatePath(`/events/${slug}`);
  revalidatePath("/schedule");
  revalidatePath("/live");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/admin");
  revalidatePath("/admin/homepage");

  return { ok: true };
}
