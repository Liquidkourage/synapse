import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/local-datetime";
import { eventPublicPath } from "@/lib/event-page-path";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { prisma } from "@/lib/prisma";

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await prisma.user.findFirst({
    where: { creatorSlug: slug, creatorActive: true },
    include: { profile: true },
  });
  if (!creator) notFound();

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      hostId: creator.id,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      eventKind: "LIVE_INTERACTIVE",
      endAt: { gte: now },
    },
    orderBy: { startAt: "asc" },
    take: 20,
  });

  const name = creator.profile?.displayName?.trim() || creator.name?.trim() || creator.creatorSlug!;
  const bio = creator.profile?.bio?.trim();
  const referral = await prisma.creatorReferralCode.findFirst({
    where: { creatorId: creator.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-start gap-5">
        {creator.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.image} alt="" className="h-24 w-24 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-violet-950/50 text-3xl text-violet-200">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-violet-300/80">Creator on Synapse</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">{name}</h1>
          {bio ? <p className="mt-2 text-zinc-400">{bio}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/subscribe" className="rounded-full bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500">
              Membership · $9.99/mo
            </Link>
            {referral ? (
              <Link href={`/r/${referral.code}`} className="rounded-full border border-zinc-600 px-4 py-2 text-zinc-200 hover:border-zinc-400">
                Creator invite link
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-white">Upcoming shows</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming published shows yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const eff = getEffectiveEventStatus(e, now);
              return (
                <li key={e.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                  <Link href={eventPublicPath(e)} className="font-medium text-violet-300 hover:underline">
                    {e.title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {statusLabel(eff)} · <LocalDateTime iso={e.startAt.toISOString()} />
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
