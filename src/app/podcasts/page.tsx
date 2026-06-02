import Link from "next/link";
import { PodcastEmbedPlayer } from "@/components/podcast-embed";
import { PodcastEpisodeCard } from "@/components/podcast-episode-card";
import { PodcastShowCard } from "@/components/podcast-show-card";
import { eventPublicPath } from "@/lib/event-page-path";
import { resolvePodcastEmbed } from "@/lib/podcast-embed";
import { podcastPlatformLabel } from "@/lib/podcast-label";
import {
  getFeaturedPodcastEpisode,
  getPodcastEpisodeCount,
  getPodcastEpisodes,
  getPopularPodcastShows,
} from "@/lib/podcast-queries";

export default async function PodcastsPage() {
  const [featured, episodes, shows, episodeTotal] = await Promise.all([
    getFeaturedPodcastEpisode(),
    getPodcastEpisodes({ limit: 12 }),
    getPopularPodcastShows(24),
    getPodcastEpisodeCount(),
  ]);

  const featuredEmbed = featured?.podcastEmbedUrl ? resolvePodcastEmbed(featured.podcastEmbedUrl) : null;
  const episodeList = episodes.filter((e) => e.id !== featured?.id);

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-violet-300/80">On demand</p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Podcasts</h1>
        <p className="max-w-2xl text-zinc-400">
          Public episodes from Synapse events. Hosts add Spotify, Apple Podcasts, or YouTube links on their event
          pages — listen here or jump to the full episode.
        </p>
      </header>

      {featured ? (
        <section className="space-y-4 rounded-3xl border border-amber-500/25 bg-amber-950/15 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-300/90">Highlighted by Synapse</p>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">{featured.title}</h2>
              <p className="text-zinc-400">{featured.shortDescription}</p>
              <p className="text-sm text-zinc-500">{podcastPlatformLabel(featured.podcastEmbedUrl)}</p>
              <Link
                href={eventPublicPath(featured)}
                className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Listen
              </Link>
            </div>
            {featuredEmbed ? (
              <PodcastEmbedPlayer
                embed={featuredEmbed}
                title={featured.title}
                episodeHref={featuredEmbed.kind === "audio" ? eventPublicPath(featured) : undefined}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {shows.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Shows</h2>
          <p className="text-sm text-zinc-500">Ranked by listeners who joined events and number of episodes.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((show) => (
              <PodcastShowCard key={show.hostId} show={show} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Latest episodes</h2>
            {episodeTotal > 0 ? (
              <p className="mt-1 text-sm text-zinc-500">
                {episodeTotal} {episodeTotal === 1 ? "episode" : "episodes"} on Synapse
              </p>
            ) : null}
          </div>
          {episodeTotal > episodeList.length ? (
            <Link
              href="/podcasts/episodes"
              className="rounded-full border border-violet-500/40 bg-violet-600/15 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-600/25"
            >
              All episodes →
            </Link>
          ) : episodeTotal > 0 ? (
            <Link
              href="/podcasts/episodes"
              className="text-sm text-violet-400 hover:text-violet-300 hover:underline"
            >
              Full list
            </Link>
          ) : null}
        </div>
        {episodeList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {episodeList.map((ep) => (
              <PodcastEpisodeCard key={ep.id} episode={ep} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-zinc-500">
            No podcast episodes yet. Hosts can add a public podcast link when creating or editing an event.
          </p>
        )}
      </section>
    </div>
  );
}
