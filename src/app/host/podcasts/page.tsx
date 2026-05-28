import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { eventPublicPath } from "@/lib/event-page-path";
import { LocalDateTime } from "@/components/local-datetime";

export default async function HostPodcastEpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string; standalone?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) redirect("/login");

  const { feed, standalone } = await searchParams;
  const hostFilter =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? {}
      : { hostId: session.user.id };

  const where =
    standalone === "1"
      ? { ...hostFilter, podcastFeedUrl: null, OR: [{ eventKind: "PODCAST" as const }, { podcastEmbedUrl: { not: null } }] }
      : feed
        ? { ...hostFilter, podcastFeedUrl: feed }
        : null;

  if (!where) redirect("/host/events");

  const episodes = await prisma.event.findMany({
    where,
    orderBy: { startAt: "desc" },
    take: 200,
  });

  const showTitle =
    episodes[0]?.podcastShowTitle?.trim() ||
    (standalone === "1" ? "Individual episodes" : "Podcast episodes");

  return (
    <div className="space-y-6">
      <Link href="/host/events" className="text-sm text-violet-400 hover:underline">
        ← Your events
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-white">{showTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {episodes.length} {episodes.length === 1 ? "episode" : "episodes"} — edit one at a time; listeners use{" "}
          <Link href="/podcasts/episodes" className="text-violet-400 hover:underline">
            /podcasts
          </Link>
          .
        </p>
      </header>
      <ul className="space-y-2">
        {episodes.map((ep) => (
          <li
            key={ep.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link href={eventPublicPath(ep)} className="font-medium text-white hover:text-violet-300">
                {ep.title}
              </Link>
              <p className="text-xs text-zinc-500">
                <LocalDateTime iso={ep.startAt.toISOString()} /> · {ep.slug}
              </p>
            </div>
            <Link href={`/host/events/${ep.id}/edit`} className="shrink-0 text-sm text-violet-400 hover:underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {episodes.length === 0 ? <p className="text-zinc-500">No episodes in this group.</p> : null}
    </div>
  );
}
