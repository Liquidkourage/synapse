import Link from "next/link";
import { getPublicLiveEvent } from "@/lib/queries";
import { statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";
import { BroadcastEmbed } from "@/components/broadcast-embed";
import { BroadcastRestrictedNotice } from "@/components/broadcast-restricted-notice";
import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { resolveDailyBroadcastEmbedUrl } from "@/lib/daily-broadcast-url";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { getGameEmbedVisibility } from "@/lib/game-embed-access";
import { StreamingEmbedUnavailable } from "@/components/streaming-embed-unavailable";
import { isSafeUrlForIframe } from "@/lib/safe-url";
import { auth } from "@/auth";

export default async function LivePage() {
  const [live, session] = await Promise.all([getPublicLiveEvent(), auth()]);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Live now</h1>
        <p className="mt-2 text-zinc-400">
          There is only one spotlight on the network. Here is what is live (or featured) right now.
        </p>
      </div>

      {live ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6">
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

          {live.broadcastEmbedUrl && (
            <div className="rounded-2xl border border-emerald-500/20 bg-black p-2">
              <p className="mb-2 px-2 text-xs font-medium text-emerald-400/90">
                {isDailyNativeBroadcastUrl(live.broadcastEmbedUrl) ? "Synapse video" : "Host video"}
              </p>
              {embedSrc ? (
                <BroadcastEmbed src={embedSrc} title="Live host video" />
              ) : !canViewBroadcast ? (
                <div className="px-2 pb-2">
                  <BroadcastRestrictedNotice session={session} />
                </div>
              ) : (
                <div className="px-2 pb-2">
                  <StreamingEmbedUnavailable />
                </div>
              )}
            </div>
          )}

          {hasAnyToolEmbed && gameEmbed.preview && (
            <p className="text-xs text-amber-400/90">
              Preview — embeds are public once this event is LIVE.
            </p>
          )}

          {live.embedUrl && gameEmbed.show && primaryEmbedSrc && (
            <div className="rounded-2xl border border-zinc-800 bg-black p-2">
              <p className="mb-2 px-2 text-xs font-medium text-zinc-500">Game / tool (primary)</p>
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  title="Embedded experience"
                  src={primaryEmbedSrc}
                  className="h-full w-full border-0"
                  allow="clipboard-write; fullscreen"
                />
              </div>
              <p className="mt-2 px-2 text-xs text-zinc-500">
                If an embed is blocked, use the external link on the event page — some hosts disallow iframes.
              </p>
            </div>
          )}

          {live.embedUrl && gameEmbed.show && !primaryEmbedSrc && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200/90">
              Primary embed URL is not a valid http(s) link.
            </div>
          )}

          {live.secondaryEmbedUrl && gameEmbed.show && secondaryEmbedSrc && (
            <div className="rounded-2xl border border-zinc-800 bg-black p-2">
              <p className="mb-2 px-2 text-xs font-medium text-zinc-500">Second embed</p>
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  title="Second embedded experience"
                  src={secondaryEmbedSrc}
                  className="h-full w-full border-0"
                  allow="clipboard-write; fullscreen"
                />
              </div>
            </div>
          )}

          {live.secondaryEmbedUrl && gameEmbed.show && !secondaryEmbedSrc && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200/90">
              Second embed URL is not a valid http(s) link.
            </div>
          )}

          {hasAnyToolEmbed && !gameEmbed.show && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
              Embeds appear here during the live window.{" "}
              {live.externalUrl && (
                <a
                  href={live.externalUrl}
                  className="text-violet-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open game in a new tab
                </a>
              )}
            </div>
          )}

          {!live.broadcastEmbedUrl && !hasAnyToolEmbed ? (
            <p className="text-sm text-zinc-500">
              No embed for this session — open the external tool from the{" "}
              <Link href={`/events/${live.slug}`} className="text-violet-400 hover:underline">
                event page
              </Link>
              .
            </p>
          ) : null}
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
