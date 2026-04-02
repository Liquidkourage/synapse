import Link from "next/link";
import { getArchiveEntries, getPublicLiveEvent, getSiteSettings, getUpcomingEvents } from "@/lib/queries";
import { EventCard } from "@/components/event-card";
import { LocalDateTime } from "@/components/local-datetime";
import { statusLabel } from "@/lib/event-status";

export default async function HomePage() {
  const [live, upcoming, archive, settings] = await Promise.all([
    getPublicLiveEvent(),
    getUpcomingEvents(6),
    getArchiveEntries(6),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-16">
      <section className="bg-grid relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 to-zinc-950 px-6 py-14 sm:px-10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-300/80">Now on Synapse</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {settings.heroTitle ?? "One live channel. Infinite games."}
          </h1>
          <p className="text-lg text-zinc-300">
            {settings.heroSubtitle ??
              "We do not run the trivia engine — we run the network. Plug in TrivNow, GameShow.host, Google Forms, or anything with a link."}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/live"
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
            >
              {live ? "Watch live" : "See what’s live"}
            </Link>
            <Link
              href="/schedule"
              className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-400"
            >
              Full schedule
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Featured live</h2>
          <Link href="/live" className="text-sm text-violet-400 hover:text-violet-300">
            Live page →
          </Link>
        </div>
        {live ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-300/90">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium">
                {statusLabel(live.effectiveStatus)}
              </span>
              <span>·</span>
              <LocalDateTime iso={live.startAt.toISOString()} />
            </div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{live.title}</h3>
            <p className="mt-2 text-zinc-400">{live.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/events/${live.slug}`}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Event details
              </Link>
              <Link href="/live" className="rounded-full border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200">
                Open live room
              </Link>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-zinc-500">
            Nothing live right now — check the schedule for the next drop.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Upcoming</h2>
          <Link href="/schedule" className="text-sm text-violet-400 hover:text-violet-300">
            All times local to you →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {upcoming.length === 0 && (
          <p className="text-zinc-500">No upcoming events published yet. Producers are probably napping.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">On-demand & replays</h2>
          <Link href="/archive" className="text-sm text-violet-400 hover:text-violet-300">
            Browse archive →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archive.map((a) => (
            <Link
              key={a.id}
              href={`/archive#${a.slug}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-violet-500/30"
            >
              {a.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumbnailUrl} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
              )}
              <h3 className="font-medium text-white">{a.title}</h3>
              {a.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{a.description}</p>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
