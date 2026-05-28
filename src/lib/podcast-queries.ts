import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/queries";
import type { Event, EventStatus, User } from "@/generated/prisma";

const PODCAST_EXCLUDED_STATUSES: EventStatus[] = ["DRAFT", "CANCELLED"];

const podcastEventWhere = {
  podcastEmbedUrl: { not: null },
  status: { notIn: PODCAST_EXCLUDED_STATUSES },
};

export type PodcastEpisodeRow = Event & {
  host: User;
  _count: { attendees: number };
};

export type PodcastShowRow = {
  hostId: string;
  host: User;
  title: string;
  episodeCount: number;
  totalListeners: number;
  latestEpisode: PodcastEpisodeRow;
  coverImageUrl: string | null;
};

export async function getPodcastEpisodes(limit = 24): Promise<PodcastEpisodeRow[]> {
  return prisma.event.findMany({
    where: podcastEventWhere,
    include: {
      host: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { startAt: "desc" },
    take: limit,
  });
}

export async function getFeaturedPodcastEpisode(): Promise<PodcastEpisodeRow | null> {
  const settings = await getSiteSettings();
  if (!settings.featuredPodcastEventId) return null;

  const ev = await prisma.event.findFirst({
    where: {
      id: settings.featuredPodcastEventId,
      podcastEmbedUrl: { not: null },
      status: { notIn: PODCAST_EXCLUDED_STATUSES },
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
  const events = await prisma.event.findMany({
    where: podcastEventWhere,
    include: {
      host: true,
      _count: { select: { attendees: true } },
    },
    orderBy: { startAt: "desc" },
  });

  const byHost = new Map<string, PodcastEpisodeRow[]>();
  for (const ev of events) {
    const list = byHost.get(ev.hostId) ?? [];
    list.push(ev);
    byHost.set(ev.hostId, list);
  }

  const shows: PodcastShowRow[] = [];
  for (const [hostId, eps] of byHost) {
    const host = eps[0]!.host;
    const totalListeners = eps.reduce((n, e) => n + e._count.attendees, 0);
    const latestEpisode = eps[0]!;
    shows.push({
      hostId,
      host,
      title: host.name?.trim() || host.email.split("@")[0] || "Show",
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

export function podcastShowPath(hostId: string): string {
  return `/podcasts/shows/${hostId}`;
}
