import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPublicLiveEvent } from "@/lib/queries";
import { statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { EventVenmoTipBlock } from "@/components/event-venmo-tip";
import { LiveViewportLayout } from "@/components/live-viewport-layout";
import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { resolveDailyBroadcastEmbedUrl } from "@/lib/daily-broadcast-url";
import { getRequestHostnameForEmbeds } from "@/lib/request-site-host";
import { ensureTwitchPlayerParents } from "@/lib/twitch-embed";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { getGameEmbedVisibility } from "@/lib/game-embed-access";
import { isSafeUrlForIframe } from "@/lib/safe-url";
import { auth } from "@/auth";
import { toChatMessageClient } from "@/lib/chat-message-dto";

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

  const rawBroadcastSrc = live
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
  const hostForEmbed = await getRequestHostnameForEmbeds();
  const embedSrc = rawBroadcastSrc ? ensureTwitchPlayerParents(rawBroadcastSrc, hostForEmbed) : null;

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
    <div className="flex min-h-0 flex-1 flex-col">
      {live ? (
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="shrink-0 space-y-3 px-4 pb-3 sm:space-y-4 sm:px-5 sm:pb-4 lg:px-6 xl:px-8">
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Live now</h1>
              <p className="mt-1 text-sm text-zinc-400 sm:mt-2 sm:text-base">
                There is only one spotlight on the network. Here is what is live (or featured) right now.
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 pb-3 sm:px-5 sm:pb-4 lg:px-6 xl:px-8">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 sm:p-6">
            <p className="text-sm text-emerald-300/90">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium">
                {statusLabel(live.effectiveStatus)}
              </span>
              <span className="ml-2 text-zinc-400">
                <LocalDateTime iso={live.startAt.toISOString()} />
              </span>
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:mt-3 sm:text-3xl">{live.title}</h2>
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
            {live.venmoHandle ? (
              <div className="mt-4">
                <EventVenmoTipBlock handle={live.venmoHandle} compact />
              </div>
            ) : null}
            </div>
          </div>

          <LiveViewportLayout
            chat={{
              eventId: live.id,
              eventSlug: live.slug,
              initialMessages: [...chatMessages].reverse().map((m) => toChatMessageClient(m)),
            }}
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
            compact
          />
        </div>
      ) : (
        <div className="shrink-0 px-4 sm:px-5 lg:px-6 xl:px-8">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Live now</h1>
          <p className="mt-1 text-sm text-zinc-400 sm:mt-2 sm:text-base">
            There is only one spotlight on the network. Here is what is live (or featured) right now.
          </p>
        </div>
      )}
      {!live ? (
        <div className="mx-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-12 text-center text-zinc-500 sm:mx-5 lg:mx-6 xl:mx-8">
          <p className="text-lg text-zinc-400">The signal is quiet.</p>
          <p className="mt-2">No live or featured event right now.</p>
          <Link href="/schedule" className="mt-6 inline-block text-violet-400 hover:underline">
            See what is next →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
