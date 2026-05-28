import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { eventPublicPath } from "@/lib/event-page-path";

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

  const where =
    session.user.role === "ADMIN" || session.user.role === "PRODUCER"
      ? {}
      : { hostId: session.user.id };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: "desc" },
    include: { host: true },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your events</h1>
          <p className="text-sm text-zinc-500">Create shows and wire up third-party games.</p>
        </div>
        <Link
          href="/host/events/new"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          New event
        </Link>
      </div>
      {importedCount > 0 ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/90">
          Imported {importedCount} episode{importedCount === 1 ? "" : "s"}
          {show ? ` for “${show}”` : ""}.
          {skippedCount > 0
            ? ` Skipped ${skippedCount} already on Synapse.`
            : null}{" "}
          <Link href="/podcasts/episodes" className="font-medium text-emerald-300 hover:underline">
            View all episodes
          </Link>
        </p>
      ) : null}
      <ul className="space-y-2">
        {events.map((e) => (
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
            <Link
              href={`/host/events/${e.id}/edit`}
              className="text-sm text-violet-400 hover:underline"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {events.length === 0 && <p className="text-zinc-500">No events yet — spin one up.</p>}
    </div>
  );
}
