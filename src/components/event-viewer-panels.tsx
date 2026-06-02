"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { BreakoutDualVideo } from "@/components/breakout-dual-video";
import { BroadcastEmbed, BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";
import { ZoomBreakoutDualVideo } from "@/components/zoom-breakout-dual-video";
import { ZoomMeetingEmbed } from "@/components/zoom-meeting-embed";
import { BroadcastRestrictedNotice } from "@/components/broadcast-restricted-notice";
import { MobileViewerTabs } from "@/components/mobile-viewer-tabs";
import { StreamingEmbedUnavailable } from "@/components/streaming-embed-unavailable";
import { ViewerCanvasLayout } from "@/components/viewer-canvas-layout";
import { useMdUp } from "@/hooks/use-md-up";
import type { ViewerCanvasLayoutV1 } from "@/lib/viewer-canvas-layout-geometry";

function ToolEmbedFrame({ title, src }: { title: string; src: string }) {
  return (
    <div className="flex h-full min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <iframe title={title} src={src} className="h-full w-full min-h-0 border-0" allow={BROADCAST_IFRAME_ALLOW} />
    </div>
  );
}

export type EventViewerPanelsGameEmbed = { show: boolean; preview: boolean };

type Props = {
  /** Stable key for saved panel sizes (e.g. `live-${slug}` or `event-${slug}`). */
  storageKey: string;
  /** e.g. "Synapse video" | "Host video" */
  broadcastLabel: string;
  /** Extra line under the label (event page copy); omit on /live */
  broadcastDescription?: string | null;
  broadcastEmbedUrl: string | null;
  broadcastIframeSrc: string | null;
  /** Breakout events: pinned host stage + meeting room for team breakouts. */
  broadcastStageIframeSrc?: string | null;
  broadcastMeetingIframeSrc?: string | null;
  broadcastBreakoutDual?: boolean;
  broadcastViewerIsHost?: boolean;
  broadcastZoomEventId?: string | null;
  canViewBroadcast: boolean;
  session: Session | null;
  gameEmbed: EventViewerPanelsGameEmbed;
  hasAnyToolEmbed: boolean;
  embedUrl: string | null;
  secondaryEmbedUrl: string | null;
  primaryEmbedSrc: string | null;
  secondaryEmbedSrc: string | null;
  externalUrl?: string | null;
  /** Shown when embeds are hidden until live */
  embedWaitingNote?: string;
  /** If set, "no session" message links here */
  liveSlug?: string;
  /** Tighter vertical spacing + full-height canvas (e.g. /live) */
  compact?: boolean;
  /** When set (typically mobile), Chat tab shows this; desktop keeps chat in EventStageShell right column */
  chatSlot?: React.ReactNode;
  /** Persisted host layout (normalized); viewers see until they customize locally. */
  hostViewerLayout?: ViewerCanvasLayoutV1 | null;
  /** Save-for-all-viewers control + API auth */
  canPublishViewerLayout?: boolean;
  /** Defaults to true — stage pages always offer chat on mobile. */
  hasMobileChatTab?: boolean;
  eventId?: string;
};

/**
 * Viewer: floating canvas (md+) with optional host-published default layout; mobile uses tabs + host default tab.
 * Local drag/resize sets a per-browser override until "Reset layout" (back to host default or built-in defaults).
 */
export function EventViewerPanels({
  storageKey,
  broadcastLabel,
  broadcastDescription,
  broadcastEmbedUrl,
  broadcastIframeSrc,
  broadcastStageIframeSrc = null,
  broadcastMeetingIframeSrc = null,
  broadcastBreakoutDual = false,
  broadcastViewerIsHost = false,
  broadcastZoomEventId = null,
  canViewBroadcast,
  session,
  gameEmbed,
  hasAnyToolEmbed,
  embedUrl,
  secondaryEmbedUrl,
  primaryEmbedSrc,
  secondaryEmbedSrc,
  externalUrl,
  embedWaitingNote = "Embeds appear here during the live window.",
  liveSlug,
  compact = false,
  chatSlot,
  hostViewerLayout = null,
  canPublishViewerLayout = false,
  hasMobileChatTab = true,
  eventId,
}: Props) {
  const mdUp = useMdUp();
  const showPrimary = !!(embedUrl && gameEmbed.show && primaryEmbedSrc);
  const showSecondary = !!(secondaryEmbedUrl && gameEmbed.show && secondaryEmbedSrc);
  const primaryInvalid = !!(embedUrl && gameEmbed.show && !primaryEmbedSrc);
  const secondaryInvalid = !!(secondaryEmbedUrl && gameEmbed.show && !secondaryEmbedSrc);

  const hasVideo = !!broadcastEmbedUrl || !!broadcastZoomEventId;
  const hasPrimary = showPrimary;
  const hasSecondary = showSecondary;
  const showResizable = hasVideo || hasPrimary || hasSecondary;

  const hasBreakoutDual =
    broadcastBreakoutDual && !!(broadcastStageIframeSrc || broadcastMeetingIframeSrc);

  const hasZoomBreakoutDual =
    !!broadcastZoomEventId &&
    broadcastBreakoutDual &&
    broadcastViewerIsHost &&
    !!broadcastStageIframeSrc;

  const zoomIframeId = broadcastZoomEventId ? `synapse-zoom-bo-${broadcastZoomEventId}` : undefined;

  const videoSlot =
    hasVideo && hasZoomBreakoutDual && broadcastZoomEventId ? (
      <ZoomBreakoutDualVideo stageSrc={broadcastStageIframeSrc!} zoomEventId={broadcastZoomEventId} />
    ) : hasVideo && broadcastZoomEventId ? (
      <ZoomMeetingEmbed
        eventId={broadcastZoomEventId}
        fill
        iframeId={broadcastViewerIsHost ? zoomIframeId : undefined}
      />
    ) : hasVideo && hasBreakoutDual ? (
      <BreakoutDualVideo
        stageSrc={broadcastStageIframeSrc}
        meetingSrc={broadcastMeetingIframeSrc}
        isHost={broadcastViewerIsHost}
      />
    ) : hasVideo && broadcastIframeSrc ? (
      <BroadcastEmbed src={broadcastIframeSrc} title="Live host video" fill showOpenInNewTab />
    ) : hasVideo && !canViewBroadcast ? (
      <div className="flex min-h-[160px] flex-1 items-center px-2">
        <BroadcastRestrictedNotice session={session} />
      </div>
    ) : hasVideo ? (
      <div className="flex min-h-[160px] flex-1 items-center px-2">
        <StreamingEmbedUnavailable />
      </div>
    ) : null;

  const videoNode =
    hasVideo && (broadcastDescription || videoSlot) ? (
      <div className="flex h-full min-h-0 flex-col gap-1">
        {broadcastDescription ? <p className="shrink-0 px-1 text-xs text-zinc-500">{broadcastDescription}</p> : null}
        {videoSlot}
      </div>
    ) : (
      videoSlot
    );

  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col ${compact ? "gap-2" : "gap-6"}`}>
      {hasAnyToolEmbed && gameEmbed.preview && (
        <p className="text-xs text-amber-400/90">Preview — embeds are public once this event is LIVE.</p>
      )}

      {primaryInvalid && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          Primary embed URL is not a valid http(s) link.
        </div>
      )}

      {secondaryInvalid && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200/90">
          Second embed URL is not a valid http(s) link.
        </div>
      )}

      {showResizable && (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          {mdUp ? (
            <ViewerCanvasLayout
              storageKey={storageKey}
              videoLabel={broadcastLabel}
              video={videoNode ?? undefined}
              primary={hasPrimary ? <ToolEmbedFrame title="Embedded experience" src={primaryEmbedSrc!} /> : undefined}
              secondary={
                hasSecondary ? <ToolEmbedFrame title="Second embedded experience" src={secondaryEmbedSrc!} /> : undefined
              }
              hasVideo={hasVideo}
              hasPrimary={hasPrimary}
              hasSecondary={hasSecondary}
              preferLargeVideoPanel={!!broadcastZoomEventId}
              disableVideoPanelZoom={!!broadcastZoomEventId}
              compact={compact}
              hostDefaultLayout={hostViewerLayout}
              eventId={eventId ?? null}
              canPublishViewerLayout={canPublishViewerLayout}
              hasMobileChatTab={hasMobileChatTab}
            />
          ) : (
            <MobileViewerTabs
              hasVideo={hasVideo}
              hasPrimary={hasPrimary}
              hasSecondary={hasSecondary}
              videoLabel={broadcastLabel}
              primaryLabel="Game / tool"
              secondaryLabel="Public display"
              defaultTabId={hostViewerLayout?.mobile?.defaultTab}
              video={
                hasVideo ? (
                  <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{videoNode}</div>
                ) : null
              }
              primary={
                hasPrimary ? (
                  <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                    <ToolEmbedFrame title="Embedded experience" src={primaryEmbedSrc!} />
                  </div>
                ) : null
              }
              secondary={
                hasSecondary ? (
                  <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                    <ToolEmbedFrame title="Second embedded experience" src={secondaryEmbedSrc!} />
                  </div>
                ) : null
              }
              chatSlot={chatSlot}
            />
          )}
        </div>
      )}

      {hasAnyToolEmbed && !gameEmbed.show && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
          {embedWaitingNote}{" "}
          {externalUrl && (
            <a
              href={externalUrl}
              className="text-violet-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in a new tab
            </a>
          )}
        </div>
      )}

      {!broadcastEmbedUrl && !hasAnyToolEmbed && liveSlug && (
        <p className="text-sm text-zinc-500">
          No embed for this session — open the external tool from the{" "}
          <Link href={`/events/${liveSlug}`} className="text-violet-400 hover:underline">
            event page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
