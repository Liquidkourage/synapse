import { prisma } from "@/lib/prisma";
import { fetchPodcastFeed } from "@/lib/podcast-rss";

/** Fill podcastShowTitle from RSS for feeds that were imported before we stored it. */
export async function backfillMissingPodcastShowTitles(): Promise<void> {
  const rows = await prisma.event.findMany({
    where: {
      podcastFeedUrl: { not: null },
      OR: [{ podcastShowTitle: null }, { podcastShowTitle: "" }],
    },
    select: { podcastFeedUrl: true },
    distinct: ["podcastFeedUrl"],
  });

  const feedUrls = rows
    .map((r) => r.podcastFeedUrl)
    .filter((u): u is string => !!u?.trim());

  for (const feedUrl of feedUrls) {
    const titled = await prisma.event.findFirst({
      where: { podcastFeedUrl: feedUrl, podcastShowTitle: { not: null } },
      select: { podcastShowTitle: true },
    });
    const title = titled?.podcastShowTitle?.trim();
    if (title) {
      await prisma.event.updateMany({
        where: {
          podcastFeedUrl: feedUrl,
          OR: [{ podcastShowTitle: null }, { podcastShowTitle: "" }],
        },
        data: { podcastShowTitle: title },
      });
      continue;
    }

    try {
      const feed = await fetchPodcastFeed(feedUrl);
      if (!feed.title.trim()) continue;
      await prisma.event.updateMany({
        where: { podcastFeedUrl: feedUrl },
        data: { podcastShowTitle: feed.title.trim() },
      });
    } catch (e) {
      console.error("[podcast-show-backfill] failed for", feedUrl, e);
    }
  }
}
