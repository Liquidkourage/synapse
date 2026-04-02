import { prisma } from "@/lib/prisma";
import { getEffectiveEventStatus } from "@/lib/event-status";
import type { Event, EventStatus } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma";

export async function getSiteSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { id: "default", siteName: "Synapse" },
    });
  }
  return settings;
}

/** Single featured live public event — site settings override, else first time-effective LIVE. */
export async function getPublicLiveEvent(): Promise<
  (Event & { effectiveStatus: EventStatus }) | null
> {
  const settings = await getSiteSettings();
  const now = new Date();

  if (settings.featuredLiveEventId) {
    const ev = await prisma.event.findUnique({
      where: { id: settings.featuredLiveEventId },
      include: { host: true, producer: true },
    });
    if (ev) {
      const effectiveStatus = getEffectiveEventStatus(ev, now);
      if (effectiveStatus !== "CANCELLED" && ev.status !== "DRAFT") {
        return { ...ev, effectiveStatus };
      }
    }
  }

  const candidates = await prisma.event.findMany({
    where: {
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: { host: true, producer: true },
    orderBy: { startAt: "asc" },
  });

  for (const ev of candidates) {
    const effectiveStatus = getEffectiveEventStatus(ev, now);
    if (effectiveStatus === "LIVE") {
      return { ...ev, effectiveStatus };
    }
  }
  return null;
}

export async function getUpcomingEvents(limit = 8) {
  const now = new Date();
  return prisma.event.findMany({
    where: {
      endAt: { gte: now },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: { host: true, producer: true },
    orderBy: { startAt: "asc" },
    take: limit,
  });
}

export async function getArchiveEntries(limit = 12) {
  return prisma.archiveEntry.findMany({
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { event: true },
  });
}

export async function searchEventsAndArchive(q: string) {
  const term = q.trim();
  if (!term) return { events: [], archives: [] as Awaited<ReturnType<typeof getArchiveEntries>> };

  /** SQLite: case-insensitive match via lower() + bound parameter */
  const eventRows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id FROM Event
      WHERE status != 'DRAFT'
      AND (
        lower(title) LIKE '%' || lower(${term}) || '%'
        OR lower(shortDescription) LIKE '%' || lower(${term}) || '%'
      )
      ORDER BY startAt DESC
      LIMIT 20
    `,
  );

  const eventIds = eventRows.map((r) => r.id);
  const events =
    eventIds.length === 0
      ? []
      : await prisma.event.findMany({
          where: { id: { in: eventIds } },
          include: { host: true },
        });
  const eventOrder = new Map(eventIds.map((id, i) => [id, i]));
  events.sort((a, b) => (eventOrder.get(a.id) ?? 0) - (eventOrder.get(b.id) ?? 0));

  const archiveRows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id FROM ArchiveEntry
      WHERE lower(title) LIKE '%' || lower(${term}) || '%'
         OR (description IS NOT NULL AND lower(description) LIKE '%' || lower(${term}) || '%')
      ORDER BY publishedAt DESC
      LIMIT 20
    `,
  );

  const archiveIds = archiveRows.map((r) => r.id);
  const archives =
    archiveIds.length === 0
      ? []
      : await prisma.archiveEntry.findMany({
          where: { id: { in: archiveIds } },
          include: { event: true },
        });
  const archiveOrder = new Map(archiveIds.map((id, i) => [id, i]));
  archives.sort((a, b) => (archiveOrder.get(a.id) ?? 0) - (archiveOrder.get(b.id) ?? 0));

  return { events, archives };
}
