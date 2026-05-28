import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/queries";
import { backfillMissingPodcastShowTitles } from "@/lib/podcast-show-backfill";
import { displayPodcastShowTitle } from "@/lib/podcast-show-meta";
import type { Event, EventStatus, Prisma, User } from "@/generated/prisma";

const PODCAST_EXCLUDED_STATUSES: EventStatus[] = ["DRAFT", "CANCELLED"];

/** Podcast-type events and legacy rows that only set podcastEmbedUrl. */
export const podcastEventWhere: Prisma.EventWhereInput = {
  status: { notIn: PODCAST_EXCLUDED_STATUSES },
  OR: [{ eventKind: "PODCAST" }, { podcastEmbedUrl: { not: null } }],
};

export type PodcastEpisodeRow = Event & {
  host: User;
  _count: { attendees: number };
};

export type PodcastShowRow = {
  hostId: string;
  host: User;
  feedUrl: string | null;
  title: string;
  episodeCount: number;
  totalListeners: number;
  latestEpisode: PodcastEpisodeRow;
  coverImageUrl: string | null;
};

export { podcastShowPath } from "@/lib/podcast-show-meta";

export async function getPodcastEpisodes(options?: { limit?: number; hostId?: string }): Promise<PodcastEpisodeRow[]> {
  await backfillMissingPodcastShowTitles();
  const { limit, hostId } = options ?? {};
  return prisma.event.findMany({
    where: {
      ...podcastEventWhere,
      ...(hostId ? { hostId } : {}),
    },
    include: {
      host: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { startAt: "desc" },
    ...(limit != null ? { take: limit } : {}),
  });
}

export async function getPodcastEpisodeCount(hostId?: string): Promise<number> {
  return prisma.event.count({
    where: {
      ...podcastEventWhere,
      ...(hostId ? { hostId } : {}),
    },
  });
}

export async function getFeaturedPodcastEpisode(): Promise<PodcastEpisodeRow | null> {
  const settings = await getSiteSettings();
  if (!settings.featuredPodcastEventId) return null;

  const ev = await prisma.event.findFirst({
    where: {
      id: settings.featuredPodcastEventId,
      ...podcastEventWhere,
    },
    include: {
      host: true,
      _count: { select: { attendees: true } },
    },
  });
  return ev;
}

/** Groups podcast events by host; ranks by total join count, then episode count. */
export async function getPopularPodcastShows(limit = 8): Promise<PodcastShowRow[]> {
  await backfillMissingPodcastShowTitles();
  const events = await prisma.event.findMany({
    where: podcastEventWhere,
    include: {
      host: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { startAt: "desc" },
  });

  const byShow = new Map<string, PodcastEpisodeRow[]>();
  for (const ev of events) {
    const key = ev.podcastFeedUrl?.trim() || `host:${ev.hostId}`;
    const list = byShow.get(key) ?? [];
    list.push(ev);
    byShow.set(key, list);
  }

  const shows: PodcastShowRow[] = [];
  for (const [, eps] of byShow) {
    const host = eps[0]!.host;
    const hostLabel = host.name?.trim() || host.email.split("@")[0] || "Show";
    const totalListeners = eps.reduce((n, e) => n + e._count.attendees, 0);
    const latestEpisode = eps[0]!;
    shows.push({
      hostId: host.id,
      host,
      feedUrl: latestEpisode.podcastFeedUrl,
      title: displayPodcastShowTitle(eps, hostLabel),
      episodeCount: eps.length,
      totalListeners,
      latestEpisode,
      coverImageUrl: latestEpisode.coverImageUrl ?? latestEpisode.bannerImageUrl ?? host.image,
    });
  }

  shows.sort((a, b) => {
    if (b.totalListeners !== a.totalListeners) return b.totalListeners - a.totalListeners;
    return b.episodeCount - a.episodeCount;
  });

  return shows.slice(0, limit);
}
