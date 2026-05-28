import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { EventJoinButton } from "@/components/event-join";
import { EventVenmoTipBlock } from "@/components/event-venmo-tip";
import { EventStageShell } from "@/components/event-stage-shell";
import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { resolveDailyBroadcastEmbedUrl } from "@/lib/daily-broadcast-url";
import { getRequestHostnameForEmbeds } from "@/lib/request-site-host";
import { ensureTwitchPlayerParents } from "@/lib/twitch-embed";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { getGameEmbedVisibility } from "@/lib/game-embed-access";
import { isSafeUrlForIframe } from "@/lib/safe-url";
import { auth } from "@/auth";
import { toChatMessageClient } from "@/lib/chat-message-dto";
import { parseViewerCanvasLayoutFromDb } from "@/lib/viewer-canvas-layout-host";
import { PodcastEmbedPlayer } from "@/components/podcast-embed";
import { podcastEmbedRejectedReason, resolvePodcastEmbed } from "@/lib/podcast-embed";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { host: true, producer: true, recurrenceSeries: true },
  });
  if (!event) notFound();

  const session = await auth();
  const eff = getEffectiveEventStatus(event);

  const rawBroadcastSrc = event.broadcastEmbedUrl
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
  const hostForEmbed = await getRequestHostnameForEmbeds();
  const embedSrc = rawBroadcastSrc ? ensureTwitchPlayerParents(rawBroadcastSrc, hostForEmbed) : null;

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
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.eventAttendance.count({ where: { eventId: event.id } }),
    session?.user?.id
      ? prisma.eventAttendance.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
        })
      : null,
  ]);

  const chatMessages = [...messages].reverse().map((m) => toChatMessageClient(m));

  const hostViewerLayout = parseViewerCanvasLayoutFromDb(event.viewerCanvasLayout);
  const canPublishViewerLayout =
    !!session?.user &&
    (session.user.role === "ADMIN" ||
      (session.user.role === "PRODUCER" && event.producerId === session.user.id) ||
      (session.user.role === "HOST" && session.user.id === event.hostId));

  const podcastEmbed = event.podcastEmbedUrl ? resolvePodcastEmbed(event.podcastEmbedUrl) : null;
  const podcastEmbedError =
    event.podcastEmbedUrl && !podcastEmbed ? podcastEmbedRejectedReason(event.podcastEmbedUrl) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {event.coverImageUrl && (
        <div className="shrink-0 px-3 sm:px-4 lg:px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.coverImageUrl}
            alt=""
            className="max-h-40 w-full rounded-2xl object-cover sm:max-h-48"
          />
        </div>
      )}

      <EventStageShell
        left={
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">{statusLabel(eff)}</span>
              {event.recurrenceNote && (
                <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-violet-200">
                  {event.recurrenceNote}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight text-white sm:text-2xl">{event.title}</h1>
              <p className="mt-2 text-sm leading-snug text-zinc-400">{event.shortDescription}</p>
              <p className="mt-2 text-xs text-zinc-500">
                <LocalDateTime iso={event.startAt.toISOString()} /> →{" "}
                <LocalDateTime iso={event.endAt.toISOString()} />
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Host: {event.host.name ?? event.host.email}
                {event.producer && <> · Producer: {event.producer.name ?? event.producer.email}</>}
              </p>
            </div>

            <EventJoinButton
              eventId={event.id}
              eventSlug={event.slug}
              initialJoined={!!userAttendance}
              attendanceCount={attendanceCount}
            />

            {event.longDescription ? (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">About</h2>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{event.longDescription}</p>
              </section>
            ) : null}

            {podcastEmbed ? (
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Podcast</h2>
                <PodcastEmbedPlayer embed={podcastEmbed} title={`Podcast: ${event.title}`} />
                <a
                  href={event.podcastEmbedUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-violet-400 hover:underline"
                >
                  Open in app / new tab
                </a>
              </section>
            ) : podcastEmbedError ? (
              <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200/90">
                <h2 className="font-medium text-amber-100/95">Podcast link</h2>
                <p className="mt-1">{podcastEmbedError}</p>
                <a
                  href={event.podcastEmbedUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-violet-400 hover:underline"
                >
                  Open link
                </a>
              </section>
            ) : null}

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Play</h2>
              <dl className="mt-2 space-y-1.5 text-xs">
                {event.platformName && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-zinc-500">Platform</dt>
                    <dd className="min-w-0 text-zinc-200">{event.platformName}</dd>
                  </div>
                )}
                {event.integrationType && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-zinc-500">Integration</dt>
                    <dd className="min-w-0 text-zinc-200">{event.integrationType}</dd>
                  </div>
                )}
              </dl>
              {event.instructions ? (
                <div className="mt-2 rounded-lg bg-zinc-950/55 p-2 text-xs text-zinc-300">
                  <strong className="text-zinc-100">Instructions</strong>
                  <p className="mt-1 whitespace-pre-wrap">{event.instructions}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                {event.externalUrl && (
                  <a
                    href={event.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-violet-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-violet-500"
                  >
                    Open external game
                  </a>
                )}
                <Link
                  href="/live"
                  className="rounded-lg border border-zinc-600 px-3 py-2 text-center text-xs text-zinc-200 hover:bg-zinc-800/50"
                >
                  Network live page
                </Link>
              </div>
              {event.venmoHandle ? (
                <div className="mt-3 border-t border-zinc-800/80 pt-3">
                  <EventVenmoTipBlock handle={event.venmoHandle} compact />
                </div>
              ) : null}
            </section>
          </div>
        }
        chat={{
          eventId: event.id,
          eventSlug: event.slug,
          initialMessages: chatMessages,
        }}
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
        hostViewerLayout={hostViewerLayout}
        canPublishViewerLayout={canPublishViewerLayout}
      />

      {(event.replayUrl || event.resultsSummary) && (
        <section className="space-y-3 border-t border-zinc-800 px-4 py-8 sm:px-5 lg:px-6">
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
    </div>
  );
}
