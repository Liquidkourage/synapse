import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { eventPublicPath } from "@/lib/event-page-path";
import { creatorDisplayName } from "@/lib/creators";

function recurrenceLabel(ruleJson: string) {
  try {
    const j = JSON.parse(ruleJson) as { label?: string };
    return j.label ?? "Recurring";
  } catch {
    return "Recurring";
  }
}

export default async function SchedulePage() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      endAt: { gte: now },
      status: { notIn: ["DRAFT", "CANCELLED"] },
      eventKind: "LIVE_INTERACTIVE",
    },
    include: {
      host: { include: { profile: true } },
      producer: true,
      recurrenceSeries: true,
    },
    orderBy: { startAt: "asc" },
  });

  const series = await prisma.recurrenceSeries.findMany({
    include: { host: { include: { profile: true } } },
    orderBy: { title: "asc" },
  });

  const live = events.filter((e) => getEffectiveEventStatus(e, now) === "LIVE");
  const upcoming = events.filter((e) => getEffectiveEventStatus(e, now) !== "LIVE");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">Schedule</h1>
        <p className="mt-2 text-zinc-400">
          Live and upcoming interactive shows. Times are in <strong className="text-zinc-200">your local timezone</strong>
          .
        </p>
      </div>

      {series.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-violet-300">Recurring programming</h2>
          <ul className="space-y-2">
            {series.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="font-medium text-white">{s.title}</span>
                {s.description && <span className="text-zinc-500"> — {s.description}</span>}
                <p className="mt-1 text-xs text-zinc-500">
                  Host:{" "}
                  {s.host.creatorSlug ? (
                    <Link href={`/creators/${s.host.creatorSlug}`} className="text-zinc-300 hover:text-violet-300">
                      {creatorDisplayName(s.host)}
                    </Link>
                  ) : (
                    creatorDisplayName(s.host)
                  )}{" "}
                  · <span className="text-zinc-400">{recurrenceLabel(s.ruleJson)}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-emerald-300">Live now</h2>
          <ol className="space-y-3">
            {live.map((e) => {
              const hostName = creatorDisplayName(e.host);
              const hostHref = e.host.creatorSlug ? `/creators/${e.host.creatorSlug}` : null;
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-950/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link href={eventPublicPath(e)} className="text-lg font-medium text-white hover:text-violet-300">
                      {e.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-500">
                      <LocalDateTime iso={e.startAt.toISOString()} /> ·{" "}
                      {hostHref ? (
                        <Link href={hostHref} className="text-zinc-300 hover:text-violet-300">
                          {hostName}
                        </Link>
                      ) : (
                        hostName
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{e.shortDescription}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                    {statusLabel(getEffectiveEventStatus(e, now))}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Upcoming</h2>
        {upcoming.length > 0 ? (
          <ol className="space-y-3">
            {upcoming.map((e) => {
              const hostName = creatorDisplayName(e.host);
              const hostHref = e.host.creatorSlug ? `/creators/${e.host.creatorSlug}` : null;
              const eff = getEffectiveEventStatus(e, now);
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link href={eventPublicPath(e)} className="text-lg font-medium text-white hover:text-violet-300">
                      {e.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-500">
                      <LocalDateTime iso={e.startAt.toISOString()} /> ·{" "}
                      {hostHref ? (
                        <Link href={hostHref} className="text-zinc-300 hover:text-violet-300">
                          {hostName}
                        </Link>
                      ) : (
                        hostName
                      )}
                      {e.platformName ? <span className="text-zinc-600"> · {e.platformName}</span> : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{e.shortDescription}</p>
                    {e.recurrenceNote ? <p className="mt-1 text-xs text-zinc-600">{e.recurrenceNote}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    {statusLabel(eff)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : live.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 text-center">
            <p className="text-lg font-medium text-zinc-200">No shows on the schedule yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Programming is being prepared. Create a free account so you&apos;re ready when the next night publishes —
              or learn how membership works across the network.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Create free account
              </Link>
              <Link
                href="/creators"
                className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400"
              >
                Creators
              </Link>
              <Link
                href="/subscribe"
                className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400"
              >
                Membership
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nothing else upcoming after what&apos;s live — check back soon.</p>
        )}
      </section>
    </div>
  );
}
