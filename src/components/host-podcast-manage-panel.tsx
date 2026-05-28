"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePodcastShow,
  resyncPodcastShow,
  updatePodcastShowTitle,
} from "@/actions/podcasts";
import { EventDeleteButton } from "@/components/event-delete-button";
import { podcastShowPath } from "@/lib/podcast-show-meta";

export function HostPodcastManagePanel({
  hostId,
  feedUrl,
  standalone,
  showTitle: initialShowTitle,
  episodeCount,
  episodes,
}: {
  hostId: string;
  feedUrl: string | null;
  standalone: boolean;
  showTitle: string;
  episodeCount: number;
  episodes: { id: string; title: string; slug: string; startLabel: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showTitle, setShowTitle] = useState(initialShowTitle);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manageReturn = feedUrl
    ? `/host/podcasts?feed=${encodeURIComponent(feedUrl)}`
    : "/host/podcasts?standalone=1";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-500/25 bg-violet-950/15 p-5 space-y-4">
        <h2 className="text-sm font-medium text-violet-200">Show settings</h2>
        {!standalone && feedUrl ? (
          <>
            <form
              action={(fd) => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const r = await updatePodcastShowTitle(fd);
                  if (r.ok) {
                    setMessage("Show title updated for all episodes in this feed.");
                    router.refresh();
                  } else setError(r.error);
                });
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="hostId" value={hostId} />
              <input type="hidden" name="feedUrl" value={feedUrl} />
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs text-zinc-500">Show title (public)</label>
                <input
                  name="podcastShowTitle"
                  value={showTitle}
                  onChange={(e) => setShowTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Save title
              </button>
            </form>
            <p className="text-xs text-zinc-500 break-all">RSS feed: {feedUrl}</p>
            <form
              action={async (fd) => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const r = await resyncPodcastShow(fd);
                  if (!r.ok) setError(r.error);
                });
              }}
            >
              <input type="hidden" name="hostId" value={hostId} />
              <input type="hidden" name="feedUrl" value={feedUrl} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
              >
                Sync new episodes from feed
              </button>
              <p className="mt-1 text-xs text-zinc-600">
                Fetches the RSS feed again and adds any episodes not already on Synapse.
              </p>
            </form>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Episodes in this group were added one at a time (no shared RSS feed). Edit or delete them individually
            below.
          </p>
        )}
        {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}
        {error ? <p className="text-sm text-amber-300/90">{error}</p> : null}
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href={podcastShowPath(hostId, feedUrl)}
            className="text-violet-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public show page
          </a>
          <a href="/podcasts/episodes" className="text-zinc-400 hover:underline">
            Public episode directory
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Episodes ({episodeCount})</h2>
        <ul className="space-y-2">
          {episodes.map((ep) => (
            <li
              key={ep.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{ep.title}</p>
                <p className="text-xs text-zinc-500">
                  {ep.startLabel} · {ep.slug}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <a href={`/host/events/${ep.id}/edit`} className="text-sm text-violet-400 hover:underline">
                  Edit
                </a>
                <EventDeleteButton eventId={ep.id} redirectTo={manageReturn} compact />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
        <h2 className="text-sm font-medium text-red-200">Danger zone</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Remove all {episodeCount} episode{episodeCount === 1 ? "" : "s"} from Synapse. This does not delete anything
          on Podbean, Spotify, or Apple — only Synapse pages and listings.
        </p>
        <button
          type="button"
          disabled={pending}
          className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/60 disabled:opacity-50"
          onClick={() => {
            if (
              !confirm(
                `Delete all ${episodeCount} episode${episodeCount === 1 ? "" : "s"} in “${showTitle}” from Synapse? This cannot be undone.`,
              )
            ) {
              return;
            }
            const fd = new FormData();
            fd.set("hostId", hostId);
            if (feedUrl) fd.set("feedUrl", feedUrl);
            if (standalone) fd.set("standalone", "1");
            startTransition(async () => {
              const r = await deletePodcastShow(fd);
              if (r && !r.ok) setError(r.error);
            });
          }}
        >
          Delete entire show from Synapse
        </button>
      </section>
    </div>
  );
}
