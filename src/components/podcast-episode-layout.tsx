import Link from "next/link";
import type { Event, User } from "@/generated/prisma";
import { LocalDateTime } from "@/components/local-datetime";
import { PodcastEmbedPlayer } from "@/components/podcast-embed";
import { eventKindLabel } from "@/lib/event-kind";
import { podcastPlatformLabel } from "@/lib/podcast-label";
import type { PodcastEmbed } from "@/lib/podcast-embed";
import { podcastShowPath } from "@/lib/podcast-queries";

type EventWithHost = Event & {
  host: User;
};

export function PodcastEpisodeLayout({
  event,
  podcastEmbed,
  podcastEmbedError,
}: {
  event: EventWithHost;
  podcastEmbed: PodcastEmbed | null;
  podcastEmbedError: string | null;
}) {
  const hostLabel = event.host.name?.trim() || event.host.email;
  const platform = podcastPlatformLabel(event.podcastEmbedUrl);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:max-w-4xl">
      <nav className="text-sm">
        <Link href="/podcasts" className="text-violet-400 hover:text-violet-300 hover:underline">
          ← All podcasts
        </Link>
      </nav>

      <header className="space-y-6">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt=""
            className="aspect-[2/1] w-full rounded-2xl border border-zinc-800 object-cover shadow-lg shadow-black/40"
          />
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-violet-600/30 px-2.5 py-0.5 font-medium text-violet-100">
              {eventKindLabel("PODCAST")}
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-zinc-400">{platform}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{event.title}</h1>
          <p className="text-lg leading-relaxed text-zinc-300">{event.shortDescription}</p>
          <p className="text-sm text-zinc-500">
            <LocalDateTime iso={event.startAt.toISOString()} />
            <span className="text-zinc-600"> · </span>
            {hostLabel}
          </p>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="podcast-player-heading">
        <h2 id="podcast-player-heading" className="sr-only">
          Listen
        </h2>
        {podcastEmbed ? (
          <>
            <PodcastEmbedPlayer embed={podcastEmbed} title={event.title} prominent />
            <div className="flex flex-wrap gap-3">
              <a
                href={event.podcastEmbedUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Open in {platform}
              </a>
              <Link
                href={podcastShowPath(event.hostId)}
                className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-400"
              >
                More from {hostLabel}
              </Link>
            </div>
          </>
        ) : podcastEmbedError ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-200/90">
            <p>{podcastEmbedError}</p>
            {event.podcastEmbedUrl ? (
              <a
                href={event.podcastEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex rounded-full bg-amber-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
              >
                Open link
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      {event.longDescription?.trim() ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Episode notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{event.longDescription}</p>
        </section>
      ) : null}
    </div>
  );
}
