import Link from "next/link";
import { LocalDateTime } from "@/components/local-datetime";
import { podcastPlatformLabel } from "@/lib/podcast-label";
import type { PodcastEpisodeRow } from "@/lib/podcast-queries";

export function PodcastEpisodeCard({
  episode,
  compact = false,
}: {
  episode: PodcastEpisodeRow;
  compact?: boolean;
}) {
  const hostLabel = episode.host.name?.trim() || episode.host.email;
  const platform = podcastPlatformLabel(episode.podcastEmbedUrl);

  return (
    <Link
      href={`/events/${episode.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:border-violet-500/35 ${
        compact ? "" : "h-full"
      }`}
    >
      {episode.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={episode.coverImageUrl}
          alt=""
          className={compact ? "h-28 w-full object-cover" : "h-36 w-full object-cover sm:h-40"}
        />
      ) : (
        <div
          className={`flex items-center justify-center bg-gradient-to-br from-violet-950/80 to-zinc-900 ${
            compact ? "h-28" : "h-36 sm:h-40"
          }`}
        >
          <span className="text-3xl opacity-40" aria-hidden>
            🎧
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span className="rounded-full bg-violet-600/20 px-2 py-0.5 font-medium text-violet-200/90">{platform}</span>
          <span>{hostLabel}</span>
        </div>
        <h3 className={`mt-2 font-semibold text-white group-hover:text-violet-200 ${compact ? "text-sm" : ""}`}>
          {episode.title}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-zinc-500">{episode.shortDescription}</p>
        <p className="mt-3 text-xs text-zinc-600">
          <LocalDateTime iso={episode.startAt.toISOString()} />
          {episode._count.attendees > 0 && (
            <span className="text-zinc-500">
              {" "}
              · {episode._count.attendees} joined
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
