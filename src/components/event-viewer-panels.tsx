"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { BroadcastEmbed } from "@/components/broadcast-embed";
import { BroadcastRestrictedNotice } from "@/components/broadcast-restricted-notice";
import { StreamingEmbedUnavailable } from "@/components/streaming-embed-unavailable";
import { ViewerCanvasLayout } from "@/components/viewer-canvas-layout";

const iframeAllow = "clipboard-write; fullscreen";

function ToolEmbedFrame({ title, src }: { title: string; src: string }) {
  return (
    <div className="flex h-full min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <iframe title={title} src={src} className="h-full w-full min-h-0 border-0" allow={iframeAllow} />
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
};

/**
 * Viewer: free-form canvas — drag title bars, resize edges/corners, per-panel zoom; layout persisted locally.
 */
export function EventViewerPanels({
  storageKey,
  broadcastLabel,
  broadcastDescription,
  broadcastEmbedUrl,
  broadcastIframeSrc,
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
}: Props) {
  const showPrimary = !!(embedUrl && gameEmbed.show && primaryEmbedSrc);
  const showSecondary = !!(secondaryEmbedUrl && gameEmbed.show && secondaryEmbedSrc);
  const primaryInvalid = !!(embedUrl && gameEmbed.show && !primaryEmbedSrc);
  const secondaryInvalid = !!(secondaryEmbedUrl && gameEmbed.show && !secondaryEmbedSrc);

  const hasVideo = !!broadcastEmbedUrl;
  const hasPrimary = showPrimary;
  const hasSecondary = showSecondary;
  const showResizable = hasVideo || hasPrimary || hasSecondary;

  const videoSlot =
    hasVideo && broadcastIframeSrc ? (
      <BroadcastEmbed src={broadcastIframeSrc} title="Live host video" fill />
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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
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
          />
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
