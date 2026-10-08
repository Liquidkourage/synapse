import Link from "next/link";
import { getArchiveEntries, getPublicLiveEvent, getUpcomingLiveEvents } from "@/lib/queries";
import { EventCard } from "@/components/event-card";
import { CreatorCard } from "@/components/creator-card";
import { LocalDateTime } from "@/components/local-datetime";
import { statusLabel } from "@/lib/event-status";
import { getPublicCreators } from "@/lib/creators";
import { membershipPriceHeadline } from "@/lib/membership-pricing";
import { getPodcastEpisodes } from "@/lib/podcast-queries";

const PROGRAMMING_FORMATS = [
  { title: "Trivia & quizzes", blurb: "Team nights, buzzers, and classic quiz formats." },
  { title: "Music bingo & games", blurb: "Sing-alongs, song ID, and music-driven play." },
  { title: "Game shows", blurb: "Hosted competitions with live audience energy." },
  { title: "Word games & puzzles", blurb: "Collaborative brainteasers and puzzle nights." },
  { title: "Comedy & variety", blurb: "Interactive comedy and surprise formats." },
  { title: "New experiments", blurb: "Curated formats that put the audience in the show." },
];

export default async function HomePage() {
  const [live, upcoming, creators, archive, recentPodcasts] = await Promise.all([
    getPublicLiveEvent(),
    getUpcomingLiveEvents(6),
    getPublicCreators(8),
    getArchiveEntries(3),
    getPodcastEpisodes({ limit: 3 }),
  ]);

  const price = membershipPriceHeadline();

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-12 sm:px-10 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(124,58,237,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(16,185,129,0.12), transparent 50%)",
          }}
        />
        <div className="relative z-10 max-w-2xl space-y-5">
          <p className="text-sm font-semibold tracking-[0.2em] text-violet-300/90">SYNAPSE</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
            Don&apos;t just watch.
            <br />
            Be part of the show.
          </h1>
          <p className="text-lg leading-relaxed text-zinc-300">
            A curated network of live, interactive entertainment — trivia, music games, game shows, and more —
            from independent creators. One membership. Every show. Unlimited participation.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/schedule"
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Explore programming
            </Link>
            <Link
              href="/subscribe"
              className="rounded-full border border-zinc-500 px-5 py-2.5 text-sm font-medium text-zinc-100 hover:border-zinc-300"
            >
              Membership · {price}
            </Link>
            {live ? (
              <Link
                href="/live"
                className="rounded-full border border-emerald-500/50 px-5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
              >
                Something&apos;s live →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Live + upcoming */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Live & upcoming</h2>
            <p className="mt-1 text-sm text-zinc-500">What&apos;s on the network right now and next.</p>
          </div>
          <Link href="/schedule" className="text-sm text-violet-400 hover:text-violet-300">
            Full schedule →
          </Link>
        </div>

        {live ? (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/25 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-300/90">
              <span className="rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                Live now
              </span>
              <span className="text-zinc-500">
                <LocalDateTime iso={live.startAt.toISOString()} />
              </span>
              {live.host ? (
                <span className="text-zinc-500">
                  · Host:{" "}
                  {live.host.creatorSlug ? (
                    <Link href={`/creators/${live.host.creatorSlug}`} className="text-emerald-200/90 hover:underline">
                      {live.host.name ?? live.host.email}
                    </Link>
                  ) : (
                    (live.host.name ?? live.host.email)
                  )}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{live.title}</h3>
            <p className="mt-2 max-w-2xl text-zinc-400">{live.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/live"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Join the stage
              </Link>
              <Link
                href={`/events/${live.slug}`}
                className="rounded-full border border-emerald-500/40 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-950/50"
              >
                Show details
              </Link>
            </div>
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : !live ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 text-center">
            <p className="text-lg font-medium text-zinc-200">Programming is being prepared</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              The schedule will fill as creators publish upcoming shows. Create a free account to be ready when the next
              night goes live — membership unlocks full participation across the network.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
                Create free account
              </Link>
              <Link href="/creators" className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
                Meet creators
              </Link>
              <Link href="/subscribe" className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
                Membership info
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No more published upcoming shows yet —{" "}
            <Link href="/schedule" className="text-violet-400 hover:underline">
              check the schedule
            </Link>{" "}
            soon.
          </p>
        )}
      </section>

      {/* Formats */}
      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-white">Discover the entertainment</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Synapse is broader than one game type — curated interactive formats share one network.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMMING_FORMATS.map((f) => (
            <li key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/35 px-4 py-4">
              <h3 className="font-medium text-zinc-100">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{f.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Creators */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Meet the creators</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Independent entertainers bring the shows — follow a host you love, then explore the rest of the network.
            </p>
          </div>
          <Link href="/creators" className="text-sm text-violet-400 hover:text-violet-300">
            All creators →
          </Link>
        </div>
        {creators.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-5 py-8 text-sm text-zinc-500">
            Creator profiles will appear here as hosts are published on the network. In the meantime, explore the{" "}
            <Link href="/schedule" className="text-violet-400 hover:underline">
              schedule
            </Link>{" "}
            and{" "}
            <Link href="/subscribe" className="text-violet-400 hover:underline">
              membership
            </Link>
            .
          </div>
        )}
      </section>

      {/* Membership */}
      <section className="rounded-3xl border border-violet-500/25 bg-violet-950/20 px-6 py-10 sm:px-10">
        <h2 className="text-2xl font-semibold text-white">One membership. Every show.</h2>
        <p className="mt-3 max-w-2xl text-zinc-300">
          <strong className="text-white">{price}</strong> for all-access participation across eligible Synapse
          programming — live stages, interactive tools, and chat — while supporting the creators who make the nights
          happen. A free account is your identity on Synapse; membership is what unlocks full play when billing and
          access controls are enabled.
        </p>
        <ul className="mt-4 max-w-xl list-disc space-y-1 pl-5 text-sm text-zinc-400">
          <li>Join shows across the network without juggling separate memberships</li>
          <li>Direct a share of subscriber support toward favorite creators</li>
          <li>Discover new hosts after the ones you already love</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/subscribe"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            How membership works
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-500 px-5 py-2.5 text-sm text-zinc-100 hover:border-zinc-300"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold text-white">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Discover a show", body: "Browse the schedule or a creator you already follow." },
            { step: "2", title: "Join Synapse", body: "Create a free account, then membership for full participation." },
            { step: "3", title: "Play along", body: "Watch, chat, and use the night’s participation tools on one stage." },
            { step: "4", title: "Explore more", body: "Find other hosts and formats across the network." },
          ].map((s) => (
            <li key={s.step} className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">Step {s.step}</span>
              <h3 className="mt-1 font-medium text-white">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Supporting content */}
      {(archive.length > 0 || recentPodcasts.length > 0) && (
        <section className="space-y-4 border-t border-zinc-800/80 pt-12">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200">More on Synapse</h2>
            <p className="mt-1 text-sm text-zinc-600">Archives and podcasts — supporting the live network, not replacing it.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {archive.length > 0 ? (
              <Link href="/archive" className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500">
                Browse archive
              </Link>
            ) : null}
            {recentPodcasts.length > 0 ? (
              <Link href="/podcasts" className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500">
                Podcasts
              </Link>
            ) : null}
            {live ? (
              <span className="rounded-full bg-zinc-900 px-4 py-2 text-zinc-500">
                Live status: {statusLabel(live.effectiveStatus)}
              </span>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
