import { createHash } from "crypto";
import type { EventStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { fetchPodcastFeed } from "@/lib/podcast-rss";
import {
  applePodcastIdFromUrl,
  classifyPodcastUrl,
  looksLikeRssFeedUrl,
  spotifyShowIdFromUrl,
} from "@/lib/podcast-url";
import { slugify } from "@/lib/slug";
import { addDurationToStart, parseDurationHhMm } from "@/lib/event-schedule";

export type PodcastImportResult = {
  created: number;
  skipped: number;
  showTitle: string;
};

export async function resolvePodcastFeedUrl(raw: string): Promise<string | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (looksLikeRssFeedUrl(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  const appleId = applePodcastIdFromUrl(trimmed);
  if (appleId && classifyPodcastUrl(trimmed) === "show") {
    return feedUrlFromApplePodcastId(appleId);
  }

  const spotifyShowId = spotifyShowIdFromUrl(trimmed);
  if (spotifyShowId) {
    return feedUrlFromSpotifyShowId(spotifyShowId);
  }

  return null;
}

async function feedUrlFromApplePodcastId(appleId: string): Promise<string | null> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&entity=podcast`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { feedUrl?: string }[] };
  return data.results?.[0]?.feedUrl ?? null;
}

async function feedUrlFromSpotifyShowId(showId: string): Promise<string | null> {
  const key = process.env.PODCAST_INDEX_API_KEY;
  const secret = process.env.PODCAST_INDEX_API_SECRET;
  if (!key || !secret) return null;

  const unixTime = Math.floor(Date.now() / 1000);
  const authHash = createHash("sha1")
    .update(key + secret + unixTime)
    .digest("hex");

  const res = await fetch(
    `https://api.podcastindex.org/api/1.0/podcasts/byspotifyid?id=${encodeURIComponent(showId)}`,
    {
      headers: {
        "User-Agent": "Synapse/1.0",
        "X-Auth-Date": String(unixTime),
        "X-Auth-Key": key,
        Authorization: authHash,
      },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { feed?: { url?: string } };
  return data.feed?.url ?? null;
}

export async function importPodcastShow(options: {
  feedOrShowUrl: string;
  hostId: string;
  producerId: string | null;
  timezone: string;
  status: EventStatus;
  showTitleFallback: string;
  showDescriptionFallback: string;
  coverImageUrl: string | null;
}): Promise<PodcastImportResult> {
  const feedUrl = await resolvePodcastFeedUrl(options.feedOrShowUrl);
  if (!feedUrl) {
    throw new PodcastImportError(
      classifyPodcastUrl(options.feedOrShowUrl) === "show" && spotifyShowIdFromUrl(options.feedOrShowUrl)
        ? "Could not load this Spotify show. Add PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET on the server, or paste an Apple Podcasts show link / RSS feed URL instead."
        : "Could not find a podcast RSS feed for that link. Use an Apple Podcasts show URL, Spotify show URL (with Podcast Index configured), or a direct RSS feed.",
    );
  }

  const feed = await fetchPodcastFeed(feedUrl);
  if (feed.episodes.length === 0) {
    throw new PodcastImportError("The podcast feed has no episodes with a supported listen link.");
  }

  const embedUrls = feed.episodes.map((e) => e.podcastEmbedUrl);
  const existing = await prisma.event.findMany({
    where: { hostId: options.hostId, podcastEmbedUrl: { in: embedUrls } },
    select: { podcastEmbedUrl: true },
  });
  const existingUrls = new Set(
    existing.map((e) => e.podcastEmbedUrl).filter((u): u is string => !!u),
  );

  const allSlugs = new Set(
    (await prisma.event.findMany({ select: { slug: true } })).map((e) => e.slug),
  );

  const defaultCover = options.coverImageUrl ?? feed.imageUrl;
  const duration = parseDurationHhMm("0:15");
  let created = 0;
  let skipped = 0;

  const toCreate = feed.episodes.filter((ep) => !existingUrls.has(ep.podcastEmbedUrl));
  skipped = feed.episodes.length - toCreate.length;

  await prisma.$transaction(async (tx) => {
    for (const ep of toCreate) {
      const slug = allocateSlug(ep.title, allSlugs);
      const startAt = ep.pubDate;
      const endAt = addDurationToStart(startAt, duration);

      await tx.event.create({
        data: {
          slug,
          title: ep.title,
          shortDescription: ep.shortDescription || options.showDescriptionFallback,
          longDescription: ep.longDescription,
          startAt,
          endAt,
          timezone: options.timezone,
          eventKind: "PODCAST",
          status: options.status,
          statusOverride: null,
          hostId: options.hostId,
          producerId: options.producerId,
          coverImageUrl: ep.coverImageUrl ?? defaultCover,
          podcastEmbedUrl: ep.podcastEmbedUrl,
        },
      });
      created += 1;
    }
  });

  return {
    created,
    skipped,
    showTitle: feed.title || options.showTitleFallback,
  };
}

export class PodcastImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PodcastImportError";
  }
}

/** True when URL is a show/feed and we should bulk-import episodes. */
export function shouldBulkImportPodcast(url: string): boolean {
  const kind = classifyPodcastUrl(url);
  return kind === "rss" || kind === "show";
}

function allocateSlug(title: string, taken: Set<string>): string {
  const base = slugify(title);
  let slug = base;
  let n = 0;
  while (taken.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  taken.add(slug);
  return slug;
}

/** Validate that a show URL can be resolved before create (optional pre-check). */
export async function canImportPodcastShow(url: string): Promise<boolean> {
  if (!shouldBulkImportPodcast(url)) return false;
  const feedUrl = await resolvePodcastFeedUrl(url);
  return !!feedUrl;
}
