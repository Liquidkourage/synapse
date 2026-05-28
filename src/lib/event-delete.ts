import type { Prisma } from "@/generated/prisma";

/** Shared cleanup before removing one or more events. */
export async function deleteEventsCleanup(tx: Prisma.TransactionClient, eventIds: string[]) {
  if (eventIds.length === 0) return;

  await tx.siteSettings.updateMany({
    where: { featuredLiveEventId: { in: eventIds } },
    data: { featuredLiveEventId: null },
  });
  await tx.siteSettings.updateMany({
    where: { featuredPodcastEventId: { in: eventIds } },
    data: { featuredPodcastEventId: null },
  });

  const customBlocks = await tx.homepageBlock.findMany({
    where: { blockType: "custom_events", payload: { not: null } },
  });
  const idSet = new Set(eventIds);
  for (const b of customBlocks) {
    if (!b.payload) continue;
    try {
      const ids = JSON.parse(b.payload) as unknown;
      if (!Array.isArray(ids)) continue;
      const next = ids.filter((id) => typeof id === "string" && !idSet.has(id));
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
    where: { eventId: { in: eventIds } },
    data: { eventId: null },
  });

  await tx.event.deleteMany({ where: { id: { in: eventIds } } });
}
