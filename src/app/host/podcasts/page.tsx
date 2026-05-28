import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { HostPodcastManagePanel } from "@/components/host-podcast-manage-panel";

export default async function HostPodcastManagePage({
  searchParams,
}: {
  searchParams: Promise<{
    feed?: string;
    standalone?: string;
    podcastImported?: string;
    podcastSkipped?: string;
    show?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) redirect("/login");

  const { feed, standalone, podcastImported, podcastSkipped, show: importShow } = await searchParams;
  const hostFilter =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? {}
      : { hostId: session.user.id };

  const where =
    standalone === "1"
      ? {
          ...hostFilter,
          podcastFeedUrl: null,
          OR: [{ eventKind: "PODCAST" as const }, { podcastEmbedUrl: { not: null } }],
        }
      : feed
        ? { ...hostFilter, podcastFeedUrl: feed }
        : null;

  if (!where) redirect("/host/events");

  const episodes = await prisma.event.findMany({
    where,
    orderBy: { startAt: "desc" },
    take: 200,
  });

  if (episodes.length === 0) redirect("/host/events");

  const hostId = episodes[0]!.hostId;
  const showTitle =
    episodes[0]?.podcastShowTitle?.trim() ||
    (standalone === "1" ? "Individual episodes" : "Podcast episodes");
  const importedCount = podcastImported ? Number.parseInt(podcastImported, 10) : 0;
  const skippedCount = podcastSkipped ? Number.parseInt(podcastSkipped, 10) : 0;

  return (
    <div className="space-y-6">
      <Link href="/host/events" className="text-sm text-violet-400 hover:underline">
        ← Your events
      </Link>
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-violet-400/90">Manage podcast</p>
        <h1 className="text-2xl font-semibold text-white">{showTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update the show, sync the feed, or remove episodes from Synapse.
        </p>
      </header>

      {importedCount > 0 ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/90">
          Added {importedCount} new episode{importedCount === 1 ? "" : "s"}
          {importShow ? ` to “${importShow}”` : ""}.
          {skippedCount > 0 ? ` ${skippedCount} already on Synapse.` : null}
        </p>
      ) : null}

      <HostPodcastManagePanel
        hostId={hostId}
        feedUrl={standalone === "1" ? null : feed ?? episodes[0]?.podcastFeedUrl ?? null}
        standalone={standalone === "1"}
        showTitle={showTitle}
        episodeCount={episodes.length}
        episodes={episodes.map((ep) => ({
          id: ep.id,
          title: ep.title,
          slug: ep.slug,
          startLabel: ep.startAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
        }))}
      />
    </div>
  );
}
