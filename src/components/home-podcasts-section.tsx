import Link from "next/link";
import { PodcastEmbedPlayer } from "@/components/podcast-embed";
import { PodcastEpisodeCard } from "@/components/podcast-episode-card";
import { PodcastShowCard } from "@/components/podcast-show-card";
import { resolvePodcastEmbed } from "@/lib/podcast-embed";
import { podcastPlatformLabel } from "@/lib/podcast-label";
import type { PodcastEpisodeRow, PodcastShowRow } from "@/lib/podcast-queries";

export function HomePodcastsSection({
  featured,
  newestEpisodes,
  popularShows,
}: {
  featured: PodcastEpisodeRow | null;
  newestEpisodes: PodcastEpisodeRow[];
  popularShows: PodcastShowRow[];
}) {
  const hasContent = featured || newestEpisodes.length > 0 || popularShows.length > 0;
  const featuredEmbed = featured?.podcastEmbedUrl ? resolvePodcastEmbed(featured.podcastEmbedUrl) : null;
  const newest = newestEpisodes.filter((e) => e.id !== featured?.id).slice(0, 4);
  const shows = popularShows.slice(0, 4);

  return (
    <section className="space-y-8 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-950/30 to-zinc-950/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-violet-300/80">Listen</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Podcasts</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            On-demand episodes from hosts — pick &quot;Podcast episode&quot; when creating an event.
          </p>
        </div>
        <Link
          href="/podcasts"
          className="rounded-full border border-violet-500/40 bg-violet-600/15 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-600/25"
        >
          All podcasts →
        </Link>
      </div>

      {featured ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-300/90">Staff pick</p>
            <h3 className="text-xl font-semibold text-white">{featured.title}</h3>
            <p className="text-sm text-zinc-400">{featured.shortDescription}</p>
            <p className="text-xs text-zinc-500">
              {podcastPlatformLabel(featured.podcastEmbedUrl)} ·{" "}
              {featured.host.name?.trim() || featured.host.email}
            </p>
            <Link
              href={`/events/${featured.slug}`}
              className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              Episode page
            </Link>
          </div>
          {featuredEmbed ? (
            <PodcastEmbedPlayer embed={featuredEmbed} title={featured.title} />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
              Open the episode page to listen.
            </div>
          )}
        </div>
      ) : null}

      {newest.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Newest episodes</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newest.map((ep) => (
              <PodcastEpisodeCard key={ep.id} episode={ep} compact />
            ))}
          </div>
        </div>
      ) : null}

      {shows.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Popular shows</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {shows.map((show) => (
              <PodcastShowCard key={show.hostId} show={show} />
            ))}
          </div>
        </div>
      ) : null}

      {!hasContent ? (
        <p className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-950/10 p-8 text-center text-sm text-zinc-500">
          No podcast episodes yet. Hosts: create an event and choose{" "}
          <span className="text-violet-300/90">Podcast episode</span> with a Spotify, Apple, or YouTube link.
        </p>
      ) : null}
    </section>
  );
}
