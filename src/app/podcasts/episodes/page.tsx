import Link from "next/link";
import { PodcastEpisodeCard } from "@/components/podcast-episode-card";
import { getPodcastEpisodeCount, getPodcastEpisodes } from "@/lib/podcast-queries";

export default async function AllPodcastEpisodesPage() {
  const [episodes, total] = await Promise.all([getPodcastEpisodes(), getPodcastEpisodeCount()]);

  return (
    <div className="space-y-8">
      <nav className="text-sm">
        <Link href="/podcasts" className="text-violet-400 hover:text-violet-300 hover:underline">
          ← Podcasts
        </Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">All episodes</h1>
        <p className="text-zinc-400">
          {total === 0
            ? "No public podcast episodes yet."
            : `${total} ${total === 1 ? "episode" : "episodes"}, newest first.`}
        </p>
      </header>

      {episodes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => (
            <PodcastEpisodeCard key={ep.id} episode={ep} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-zinc-500">
          Hosts can publish episodes by creating an event and choosing{" "}
          <span className="text-violet-300/90">Podcast episode</span> with a Spotify, Apple, or YouTube link.
        </p>
      )}
    </div>
  );
}
