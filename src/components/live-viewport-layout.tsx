"use client";

import type { Session } from "next-auth";
import { EventChat } from "@/components/event-chat";
import { EventViewerPanels, type EventViewerPanelsGameEmbed } from "@/components/event-viewer-panels";
import { useMdUp } from "@/hooks/use-md-up";
import type { ChatMessageClient } from "@/lib/chat-message-dto";

type Props = {
  chat: {
    eventId: string;
    eventSlug: string;
    initialMessages: ChatMessageClient[];
  };
  storageKey: string;
  broadcastLabel: string;
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
  liveSlug?: string;
  compact?: boolean;
};

/**
 * /live only: one EventChat instance — sidebar on md+, Chat tab on small screens.
 */
export function LiveViewportLayout(props: Props) {
  const { chat, ...panelProps } = props;
  const mdUp = useMdUp();

  const chatEl = (
    <EventChat
      eventId={chat.eventId}
      eventSlug={chat.eventSlug}
      layout={mdUp ? "sideRail" : "embedded"}
      initialMessages={chat.initialMessages}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] max-md:min-h-[min(52dvh,560px)] md:grid-cols-[minmax(0,1fr)_17.5rem] md:items-stretch xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]">
      {mdUp ? (
        <>
          <div className="flex h-full min-h-0 min-w-0 flex-col md:pl-0">
            <EventViewerPanels {...panelProps} chatSlot={undefined} />
          </div>
          <aside className="flex min-h-0 w-full min-w-0 flex-col border-zinc-800 px-4 pb-4 pt-2 md:sticky md:top-[4.5rem] md:max-h-[calc(100dvh-4.5rem)] md:self-stretch md:border-l md:border-t-0 md:px-3 md:pb-3 md:pt-0 lg:px-4">
            {chatEl}
          </aside>
        </>
      ) : (
        <EventViewerPanels {...panelProps} chatSlot={chatEl} />
      )}
    </div>
  );
}
