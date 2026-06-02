"use client";

import type { Session } from "next-auth";
import { EventChat } from "@/components/event-chat";
import { EventViewerPanels, type EventViewerPanelsGameEmbed } from "@/components/event-viewer-panels";
import { useLgUp } from "@/hooks/use-lg-up";
import type { ChatMessageClient } from "@/lib/chat-message-dto";
import type { ViewerCanvasLayoutV1 } from "@/lib/viewer-canvas-layout-geometry";

type ViewerPanelsProps = {
  storageKey: string;
  broadcastLabel: string;
  broadcastDescription?: string | null;
  broadcastEmbedUrl: string | null;
  broadcastIframeSrc: string | null;
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
  embedWaitingNote?: string;
  liveSlug?: string;
  compact?: boolean;
  hostViewerLayout?: ViewerCanvasLayoutV1 | null;
  canPublishViewerLayout?: boolean;
  hasMobileChatTab?: boolean;
};

export type EventStageShellProps = ViewerPanelsProps & {
  /** Event meta, links, host — typically from the server page. */
  left: React.ReactNode;
  chat: {
    eventId: string;
    eventSlug: string;
    initialMessages: ChatMessageClient[];
    canManageAnnouncements?: boolean;
    canPost?: boolean;
  };
  /** Optional title strip above the grid (e.g. “Live now”). */
  banner?: React.ReactNode;
};

/**
 * Viewer stage: ~15% event info | ~70% resizable canvas | ~15% chat (at lg+).
 * Below lg: stacked — info, canvas, chat (or chat inside mobile viewer tabs when passed via chatSlot).
 */
export function EventStageShell({ left, chat, banner, ...panelProps }: EventStageShellProps) {
  const lgUp = useLgUp();

  const chatEl = (
    <EventChat
      eventId={chat.eventId}
      eventSlug={chat.eventSlug}
      layout={lgUp ? "stageRail" : "embedded"}
      initialMessages={chat.initialMessages}
      canManageAnnouncements={!!chat.canManageAnnouncements}
      canPost={chat.canPost ?? true}
    />
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {banner ? <div className="shrink-0 border-b border-zinc-800/80 px-3 py-3 sm:px-4 lg:px-5">{banner}</div> : null}
      <div
        className={
          "grid min-h-0 min-w-0 w-full flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] " +
          "lg:grid-cols-[minmax(0,15fr)_minmax(0,70fr)_minmax(0,15fr)] lg:grid-rows-1 lg:items-stretch"
        }
      >
        <aside
          className={
            "flex max-h-[40vh] min-h-0 flex-col gap-3 overflow-y-auto border-zinc-800 px-3 py-3 sm:px-4 " +
            "lg:max-h-none lg:border-r lg:py-4 lg:pl-4 lg:pr-3"
          }
        >
          {left}
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-col border-zinc-800 px-2 py-2 sm:px-3 lg:border-x lg:px-3 lg:py-3">
          <div className="flex min-h-[min(52dvh,560px)] flex-1 flex-col lg:min-h-[min(72dvh,calc(100dvh-10.5rem))]">
            <EventViewerPanels {...panelProps} chatSlot={lgUp ? undefined : chatEl} eventId={chat.eventId} />
          </div>
        </div>

        <aside
          className={
            "hidden min-w-0 flex-col border-zinc-800 lg:flex lg:sticky lg:top-20 lg:max-h-[calc(100dvh-5.5rem)] lg:self-start " +
            "lg:border-l lg:border-t-0 lg:py-3 lg:pl-3 lg:pr-4"
          }
        >
          {chatEl}
        </aside>
      </div>
    </div>
  );
}
