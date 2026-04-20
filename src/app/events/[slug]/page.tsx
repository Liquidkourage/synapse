import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { EventChat } from "@/components/event-chat";
import { EventJoinButton } from "@/components/event-join";
import { EventViewerPanels } from "@/components/event-viewer-panels";
import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { resolveDailyBroadcastEmbedUrl } from "@/lib/daily-broadcast-url";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { getGameEmbedVisibility } from "@/lib/game-embed-access";
import { isSafeUrlForIframe } from "@/lib/safe-url";
import { auth } from "@/auth";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { host: true, producer: true, recurrenceSeries: true },
  });
  if (!event) notFound();

  const session = await auth();
  const eff = getEffectiveEventStatus(event);

  const embedSrc = event.broadcastEmbedUrl
    ? await resolveDailyBroadcastEmbedUrl(
        {
          broadcastEmbedUrl: event.broadcastEmbedUrl,
          broadcastHostOnlyJoin: event.broadcastHostOnlyJoin,
          broadcastStreamingMode: event.broadcastStreamingMode,
          hostId: event.hostId,
          producerId: event.producerId,
        },
        session,
      )
    : null;

  const canViewBroadcast = canViewBroadcastEmbed(
    {
      hostId: event.hostId,
      producerId: event.producerId,
      broadcastHostOnlyJoin: event.broadcastHostOnlyJoin ?? false,
    },
    session,
  );

  const hasAnyToolEmbed = !!(event.embedUrl || event.secondaryEmbedUrl);
  const gameEmbed = hasAnyToolEmbed
    ? getGameEmbedVisibility(event, eff, session)
    : { show: false, preview: false };
  const gameEmbedSrc = event.embedUrl && isSafeUrlForIframe(event.embedUrl) ? event.embedUrl : null;
  const secondaryEmbedSrc =
    event.secondaryEmbedUrl && isSafeUrlForIframe(event.secondaryEmbedUrl) ? event.secondaryEmbedUrl : null;

  const broadcastLabel =
    event.broadcastEmbedUrl && isDailyNativeBroadcastUrl(event.broadcastEmbedUrl)
      ? "Synapse video"
      : "Host video (embed)";

  const broadcastDescription = event.broadcastEmbedUrl
    ? event.broadcastHostOnlyJoin
      ? "Hidden from players — only the host (and staff) see the embed here."
      : event.broadcastStreamingMode && isDailyNativeBroadcastUrl(event.broadcastEmbedUrl)
        ? "Streaming layout — host on camera; players watch without joining the call."
        : isDailyNativeBroadcastUrl(event.broadcastEmbedUrl)
          ? "Built-in Daily.co room — viewers stay on Synapse."
          : "Live capture from your embed URL — viewers stay on Synapse."
    : null;

  const [messages, attendanceCount, userAttendance] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: true },
    }),
    prisma.eventAttendance.count({ where: { eventId: event.id } }),
    session?.user?.id
      ? prisma.eventAttendance.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
        })
      : null,
  ]);

  return (
    <div className="space-y-10">
      {event.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.coverImageUrl} alt="" className="max-h-72 w-full rounded-2xl object-cover" />
      )}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">{statusLabel(eff)}</span>
          {event.recurrenceNote && (
            <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-violet-200">{event.recurrenceNote}</span>
          )}
        </div>
        <h1 className="text-4xl font-semibold text-white">{event.title}</h1>
        <p className="text-xl text-zinc-400">{event.shortDescription}</p>
        <p className="text-sm text-zinc-500">
          <LocalDateTime iso={event.startAt.toISOString()} /> → <LocalDateTime iso={event.endAt.toISOString()} />
        </p>
        <p className="text-sm text-zinc-500">
          Host: {event.host.name ?? event.host.email}
          {event.producer && <> · Producer: {event.producer.name ?? event.producer.email}</>}
        </p>
      </header>

      <EventJoinButton
        eventId={event.id}
        eventSlug={event.slug}
        initialJoined={!!userAttendance}
        attendanceCount={attendanceCount}
      />

      {event.longDescription && (
        <section className="prose prose-invert max-w-none">
          <h2 className="text-lg font-medium text-white">About</h2>
          <p className="whitespace-pre-wrap text-zinc-300">{event.longDescription}</p>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-medium text-white">Play</h2>
        <dl className="mt-4 space-y-2 text-sm">
          {event.platformName && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-zinc-500">Platform</dt>
              <dd className="text-zinc-200">{event.platformName}</dd>
            </div>
          )}
          {event.integrationType && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-zinc-500">Integration</dt>
              <dd className="text-zinc-200">{event.integrationType}</dd>
            </div>
          )}
        </dl>
        {event.instructions && (
          <div className="mt-4 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">
            <strong className="text-zinc-100">Instructions</strong>
            <p className="mt-2 whitespace-pre-wrap">{event.instructions}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {event.externalUrl && (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Open external game
            </a>
          )}
          <Link href="/live" className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200">
            Network live page
          </Link>
        </div>
        <div className="mt-8 flex min-h-[min(50dvh,480px)] flex-col">
          <EventViewerPanels
            storageKey={`event-${event.slug}`}
            broadcastLabel={broadcastLabel}
            broadcastDescription={broadcastDescription}
            broadcastEmbedUrl={event.broadcastEmbedUrl}
            broadcastIframeSrc={embedSrc}
            canViewBroadcast={canViewBroadcast}
            session={session}
            gameEmbed={gameEmbed}
            hasAnyToolEmbed={hasAnyToolEmbed}
            embedUrl={event.embedUrl}
            secondaryEmbedUrl={event.secondaryEmbedUrl}
            primaryEmbedSrc={gameEmbedSrc}
            secondaryEmbedSrc={secondaryEmbedSrc}
            externalUrl={event.externalUrl}
            embedWaitingNote="Configured embeds appear here during the live window."
          />
        </div>
      </section>

      {(event.replayUrl || event.resultsSummary) && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-white">After the show</h2>
          {event.replayUrl && (
            <p>
              <a href={event.replayUrl} className="text-violet-400 hover:underline" target="_blank" rel="noreferrer">
                Replay link
              </a>
            </p>
          )}
          {event.resultsSummary && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
              <strong className="text-white">Results / summary</strong>
              <p className="mt-2 whitespace-pre-wrap">{event.resultsSummary}</p>
            </div>
          )}
        </section>
      )}

      <EventChat
        eventId={event.id}
        eventSlug={event.slug}
        initialMessages={[...messages].reverse().map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          author: m.user?.name ?? m.user?.email ?? m.guestName ?? "Guest",
        }))}
      />
    </div>
  );
}
