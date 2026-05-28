import Link from "next/link";
import { podcastShowPath, type PodcastShowRow } from "@/lib/podcast-queries";

export function PodcastShowCard({ show }: { show: PodcastShowRow }) {
  return (
    <Link
      href={podcastShowPath(show.hostId, show.feedUrl)}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-violet-500/35"
    >
      {show.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={show.coverImageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-950/60 text-2xl">
          🎙️
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-white group-hover:text-violet-200">{show.title}</h3>
        <p className="mt-0.5 text-sm text-zinc-500">
          {show.episodeCount} {show.episodeCount === 1 ? "episode" : "episodes"}
          {show.totalListeners > 0 && (
            <span className="text-zinc-600">
              {" "}
              · {show.totalListeners} {show.totalListeners === 1 ? "listener" : "listeners"}
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-xs text-zinc-600">Latest: {show.latestEpisode.title}</p>
      </div>
    </Link>
  );
}
