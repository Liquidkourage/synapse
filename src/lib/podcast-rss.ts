import Parser from "rss-parser";
import { resolvePodcastEmbed } from "@/lib/podcast-embed";

export type ParsedRssEpisode = {
  title: string;
  shortDescription: string;
  longDescription: string | null;
  pubDate: Date;
  podcastEmbedUrl: string;
  coverImageUrl: string | null;
};

export type ParsedRssFeed = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  episodes: ParsedRssEpisode[];
};

const parser = new Parser();

const MAX_EPISODES = 150;

export async function fetchPodcastFeed(feedUrl: string): Promise<ParsedRssFeed> {
  const feed = await parser.parseURL(feedUrl);
  const channelImage =
    (feed.image?.url as string | undefined) ??
    (feed.itunes?.image as string | undefined) ??
    null;

  const episodes: ParsedRssEpisode[] = [];

  for (const item of feed.items ?? []) {
    const podcastEmbedUrl = episodeListenUrl(item);
    if (!podcastEmbedUrl) continue;

    const title = (item.title ?? "Untitled episode").trim();
    const itemAny = item as Parser.Item & {
      description?: string;
      id?: string;
      itunes?: { image?: string };
    };
    const rawDesc =
      item.contentSnippet ?? item.content ?? item.summary ?? itemAny.description ?? "";
    const description = stripHtml(String(rawDesc));
    const pubDate = item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : new Date();

    const itemImage = itemAny.itunes?.image ?? null;

    episodes.push({
      title,
      shortDescription: truncate(description || title, 500),
      longDescription: description ? truncate(description, 10000) : null,
      pubDate: Number.isNaN(pubDate.getTime()) ? new Date() : pubDate,
      podcastEmbedUrl,
      coverImageUrl: itemImage || channelImage,
    });
  }

  episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return {
    title: (feed.title ?? "Podcast").trim(),
    description: feed.description ? stripHtml(feed.description) : null,
    imageUrl: channelImage,
    episodes: episodes.slice(0, MAX_EPISODES),
  };
}

function episodeListenUrl(item: Parser.Item): string | null {
  const itemAny = item as Parser.Item & { id?: string };
  const guid = String(item.guid ?? itemAny.id ?? "");

  const spotifyEp = guid.match(/spotify:episode:([a-zA-Z0-9]+)/i);
  if (spotifyEp) return `https://open.spotify.com/episode/${spotifyEp[1]}`;

  const link = item.link?.trim();
  if (link && resolvePodcastEmbed(link)) return link;

  const enclosure = item.enclosure?.url?.trim();
  if (enclosure && resolvePodcastEmbed(enclosure)) return enclosure;

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}
