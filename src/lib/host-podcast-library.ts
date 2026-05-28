import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export type HostPodcastGroup = {
  feedUrl: string | null;
  hostId: string;
  showTitle: string;
  episodeCount: number;
  latestStartAt: Date;
  coverImageUrl: string | null;
};

const podcastEpisodeWhere = (hostFilter: Prisma.EventWhereInput): Prisma.EventWhereInput => ({
  ...hostFilter,
  OR: [{ eventKind: "PODCAST" }, { podcastEmbedUrl: { not: null } }],
});

export async function getHostPodcastGroups(hostFilter: Prisma.EventWhereInput): Promise<HostPodcastGroup[]> {
  const episodes = await prisma.event.findMany({
    where: podcastEpisodeWhere(hostFilter),
    select: {
      hostId: true,
      podcastFeedUrl: true,
      podcastShowTitle: true,
      title: true,
      startAt: true,
      coverImageUrl: true,
    },
    orderBy: { startAt: "desc" },
  });

  const byFeed = new Map<string, HostPodcastGroup>();

  for (const ep of episodes) {
    const key = ep.podcastFeedUrl?.trim() || "__standalone__";
    const existing = byFeed.get(key);
    const showTitle =
      ep.podcastShowTitle?.trim() ||
      (key === "__standalone__" ? "Individual episodes" : "Podcast show");

    if (!existing) {
      byFeed.set(key, {
        feedUrl: key === "__standalone__" ? null : ep.podcastFeedUrl,
        hostId: ep.hostId,
        showTitle,
        episodeCount: 1,
        latestStartAt: ep.startAt,
        coverImageUrl: ep.coverImageUrl,
      });
    } else {
      existing.episodeCount += 1;
      if (ep.startAt > existing.latestStartAt) {
        existing.latestStartAt = ep.startAt;
        if (ep.coverImageUrl) existing.coverImageUrl = ep.coverImageUrl;
      }
      if (!existing.showTitle && ep.podcastShowTitle) {
        existing.showTitle = ep.podcastShowTitle.trim();
      }
    }
  }

  return [...byFeed.values()].sort((a, b) => b.latestStartAt.getTime() - a.latestStartAt.getTime());
}

export function hostPodcastManageHref(feedUrl: string | null): string {
  if (!feedUrl) return "/host/podcasts?standalone=1";
  return `/host/podcasts?feed=${encodeURIComponent(feedUrl)}`;
}
