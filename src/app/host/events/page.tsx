import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { eventPublicPath } from "@/lib/event-page-path";
import { getHostPodcastGroups, hostPodcastManageHref } from "@/lib/host-podcast-library";
import { podcastShowPath } from "@/lib/podcast-show-meta";

export default async function HostEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ podcastImported?: string; podcastSkipped?: string; show?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) redirect("/login");

  const { podcastImported, podcastSkipped, show } = await searchParams;
  const importedCount = podcastImported ? Number.parseInt(podcastImported, 10) : 0;
  const skippedCount = podcastSkipped ? Number.parseInt(podcastSkipped, 10) : 0;

  const hostFilter =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? {}
      : { hostId: session.user.id };

  const [liveEvents, podcastGroups] = await Promise.all([
    prisma.event.findMany({
      where: {
        ...hostFilter,
        eventKind: "LIVE_INTERACTIVE",
        podcastEmbedUrl: null,
      },
      orderBy: { startAt: "desc" },
      take: 50,
    }),
    getHostPodcastGroups(hostFilter),
  ]);

  const podcastEpisodeTotal = podcastGroups.reduce((n, g) => n + g.episodeCount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your events</h1>
          <p className="text-sm text-zinc-500">Live shows and games — podcasts are grouped below.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/host/events/new"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            New event
          </Link>
        </div>
      </div>

      {importedCount > 0 ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/90">
          Imported {importedCount} episode{importedCount === 1 ? "" : "s"}
          {show ? ` for “${show}”` : ""}.
          {skippedCount > 0 ? ` Skipped ${skippedCount} already on Synapse.` : null}{" "}
          <Link href="/podcasts/episodes" className="font-medium text-emerald-300 hover:underline">
            Public episode list
          </Link>
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-white">Live &amp; interactive</h2>
        {liveEvents.length > 0 ? (
          <ul className="space-y-2">
            {liveEvents.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div>
                  <Link href={eventPublicPath(e)} className="font-medium text-white hover:text-violet-300">
                    {e.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{e.slug}</p>
                </div>
                <Link href={`/host/events/${e.id}/edit`} className="text-sm text-violet-400 hover:underline">
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-sm text-zinc-500">
            No live events yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium text-white">Podcasts</h2>
            {podcastEpisodeTotal > 0 ? (
              <p className="text-sm text-zinc-500">
                {podcastEpisodeTotal} episode{podcastEpisodeTotal === 1 ? "" : "s"} in {podcastGroups.length}{" "}
                {podcastGroups.length === 1 ? "show" : "shows"}
              </p>
            ) : null}
          </div>
          {podcastEpisodeTotal > 0 ? (
            <Link
              href="/podcasts/episodes"
              className="text-sm text-violet-400 hover:text-violet-300 hover:underline"
            >
              Public directory →
            </Link>
          ) : null}
        </div>
        {podcastGroups.length > 0 ? (
          <ul className="space-y-2">
            {podcastGroups.map((group) => (
              <li
                key={group.feedUrl ?? "standalone"}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-950/15 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {group.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.coverImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-900/50 text-lg">
                      🎙️
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-white">{group.showTitle}</p>
                    <p className="text-xs text-zinc-500">
                      {group.episodeCount} {group.episodeCount === 1 ? "episode" : "episodes"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href={podcastShowPath(group.hostId, group.feedUrl)}
                    className="text-zinc-400 hover:text-violet-300 hover:underline"
                  >
                    Public show
                  </Link>
                  <Link
                    href={hostPodcastManageHref(group.feedUrl)}
                    className="font-medium text-violet-400 hover:underline"
                  >
                    Manage episodes
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-sm text-zinc-500">
            No podcasts yet. Create an event and choose Podcast episode with a show or RSS link.
          </p>
        )}
      </section>
    </div>
  );
}
