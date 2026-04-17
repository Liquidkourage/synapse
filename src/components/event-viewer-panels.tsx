import Link from "next/link";
import type { Session } from "next-auth";
import { BroadcastEmbed } from "@/components/broadcast-embed";
import { BroadcastRestrictedNotice } from "@/components/broadcast-restricted-notice";
import { StreamingEmbedUnavailable } from "@/components/streaming-embed-unavailable";

const iframeAllow = "clipboard-write; fullscreen";

function EmbedShell({
  label,
  title,
  src,
  footnote,
}: {
  label: string;
  title: string;
  src: string;
  footnote?: string;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-black p-2">
      <p className="mb-2 shrink-0 px-2 text-xs font-medium text-zinc-500">{label}</p>
      <div className="aspect-video w-full min-h-[180px] overflow-hidden rounded-xl">
        <iframe title={title} src={src} className="h-full w-full border-0" allow={iframeAllow} />
      </div>
      {footnote ? <p className="mt-2 shrink-0 px-2 text-xs text-zinc-500">{footnote}</p> : null}
    </div>
  );
}

export type EventViewerPanelsGameEmbed = { show: boolean; preview: boolean };

type Props = {
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
 * Viewer layout: host video full width, then primary + secondary tool embeds in one row on large screens
 * so phone + display + host can be on screen together without only vertical scrolling on desktop.
 */
export function EventViewerPanels({
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
  const twoUp = showPrimary && showSecondary;

  return (
    <div className="space-y-6">
      {broadcastEmbedUrl && (
        <div className="rounded-2xl border border-emerald-500/20 bg-black p-2">
          <h3 className="px-2 text-sm font-medium text-emerald-400/90">{broadcastLabel}</h3>
          {broadcastDescription ? (
            <p className="mt-1 px-2 text-xs text-zinc-500">{broadcastDescription}</p>
          ) : null}
          <div className="mt-3">
          {broadcastIframeSrc ? (
            <BroadcastEmbed src={broadcastIframeSrc} title="Live host video" />
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
        </div>
      )}

      {hasAnyToolEmbed && gameEmbed.preview && (
        <p className="text-xs text-amber-400/90">
          Preview — embeds are public once this event is LIVE.
        </p>
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

      {(showPrimary || showSecondary) && (
        <div
          className={
            twoUp
              ? "grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-4"
              : "flex flex-col gap-4"
          }
        >
          {showPrimary && (
            <EmbedShell
              label="Game / tool (primary)"
              title="Embedded experience"
              src={primaryEmbedSrc!}
              footnote={
                twoUp
                  ? undefined
                  : "If an embed is blocked, use the external link on the event page — some hosts disallow iframes."
              }
            />
          )}
          {showSecondary && (
            <EmbedShell label="Second embed (e.g. public display)" title="Second embedded experience" src={secondaryEmbedSrc!} />
          )}
        </div>
      )}

      {twoUp && (
        <p className="text-xs text-zinc-500">
          If an embed is blocked, use the external link above — some hosts disallow iframes.
        </p>
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
