import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPublicLiveEvent } from "@/lib/queries";
import { statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { EventChat } from "@/components/event-chat";
import { EventViewerPanels } from "@/components/event-viewer-panels";
import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { resolveDailyBroadcastEmbedUrl } from "@/lib/daily-broadcast-url";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { getGameEmbedVisibility } from "@/lib/game-embed-access";
import { isSafeUrlForIframe } from "@/lib/safe-url";
import { auth } from "@/auth";

export default async function LivePage() {
  const [live, session] = await Promise.all([getPublicLiveEvent(), auth()]);

  const chatMessages = live
    ? await prisma.chatMessage.findMany({
        where: { eventId: live.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true },
      })
    : [];

  const hasAnyToolEmbed = !!(live?.embedUrl || live?.secondaryEmbedUrl);
  const gameEmbed =
    hasAnyToolEmbed && live
      ? getGameEmbedVisibility(live, live.effectiveStatus, session)
      : { show: false, preview: false };

  const primaryEmbedSrc =
    live?.embedUrl && isSafeUrlForIframe(live.embedUrl) ? live.embedUrl : null;
  const secondaryEmbedSrc =
    live?.secondaryEmbedUrl && isSafeUrlForIframe(live.secondaryEmbedUrl) ? live.secondaryEmbedUrl : null;

  const embedSrc = live
    ? await resolveDailyBroadcastEmbedUrl(
        {
          broadcastEmbedUrl: live.broadcastEmbedUrl,
          broadcastHostOnlyJoin: live.broadcastHostOnlyJoin,
          broadcastStreamingMode: live.broadcastStreamingMode,
          hostId: live.hostId,
          producerId: live.producerId,
        },
        session,
      )
    : null;

  const canViewBroadcast = live
    ? canViewBroadcastEmbed(
        {
          hostId: live.hostId,
          producerId: live.producerId,
          broadcastHostOnlyJoin: live.broadcastHostOnlyJoin ?? false,
        },
        session,
      )
    : false;

  const broadcastLabel =
    live?.broadcastEmbedUrl && isDailyNativeBroadcastUrl(live.broadcastEmbedUrl)
      ? "Synapse video"
      : "Host video";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold text-white">Live now</h1>
        <p className="mt-2 text-zinc-400">
          There is only one spotlight on the network. Here is what is live (or featured) right now.
        </p>
      </div>

      {live ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="shrink-0 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6">
            <p className="text-sm text-emerald-300/90">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium">
                {statusLabel(live.effectiveStatus)}
              </span>
              <span className="ml-2 text-zinc-400">
                <LocalDateTime iso={live.startAt.toISOString()} />
              </span>
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{live.title}</h2>
            <p className="mt-2 text-zinc-400">{live.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/events/${live.slug}`}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Full event page
              </Link>
              {live.externalUrl && (
                <a
                  href={live.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Open game ({live.platformName ?? "external"})
                </a>
              )}
            </div>
          </div>

          {/* Grid keeps a dedicated chat column from md up; flex row was easy to confuse with canvas padding */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_20rem] md:items-stretch md:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] lg:min-h-[min(80vh,720px)]">
            <div className="min-h-0 min-w-0">
              <EventViewerPanels
                storageKey={`live-${live.slug}`}
                broadcastLabel={broadcastLabel}
                broadcastEmbedUrl={live.broadcastEmbedUrl}
                broadcastIframeSrc={embedSrc}
                canViewBroadcast={canViewBroadcast}
                session={session}
                gameEmbed={gameEmbed}
                hasAnyToolEmbed={hasAnyToolEmbed}
                embedUrl={live.embedUrl}
                secondaryEmbedUrl={live.secondaryEmbedUrl}
                primaryEmbedSrc={primaryEmbedSrc}
                secondaryEmbedSrc={secondaryEmbedSrc}
                externalUrl={live.externalUrl}
                liveSlug={live.slug}
              />
            </div>
            <aside className="flex min-h-0 w-full min-w-0 flex-col border-zinc-800 md:sticky md:top-20 md:max-h-[calc(100dvh-5rem)] md:border-l md:pl-5">
              <EventChat
                eventId={live.id}
                eventSlug={live.slug}
                layout="sideRail"
                initialMessages={[...chatMessages].reverse().map((m) => ({
                  id: m.id,
                  body: m.body,
                  createdAt: m.createdAt.toISOString(),
                  author: m.user?.name ?? m.user?.email ?? m.guestName ?? "Guest",
                }))}
              />
            </aside>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-12 text-center text-zinc-500">
          <p className="text-lg text-zinc-400">The signal is quiet.</p>
          <p className="mt-2">No live or featured event right now.</p>
          <Link href="/schedule" className="mt-6 inline-block text-violet-400 hover:underline">
            See what is next →
          </Link>
        </div>
      )}
    </div>
  );
}
