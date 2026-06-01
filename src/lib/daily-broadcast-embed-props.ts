import type { Session } from "next-auth";
import { resolveDailyBroadcastEmbeds } from "@/lib/daily-broadcast-url";
import { ensureTwitchPlayerParents } from "@/lib/twitch-embed";

type EventForEmbed = Parameters<typeof resolveDailyBroadcastEmbeds>[0];

export type BroadcastEmbedPageProps = {
  broadcastIframeSrc: string | null;
  broadcastStageIframeSrc: string | null;
  broadcastMeetingIframeSrc: string | null;
  broadcastBreakoutDual: boolean;
  broadcastViewerIsHost: boolean;
};

export async function getBroadcastEmbedPageProps(
  event: EventForEmbed,
  session: Session | null,
  hostForEmbeds: string | null,
): Promise<BroadcastEmbedPageProps> {
  const host = hostForEmbeds ?? "";
  const resolved = await resolveDailyBroadcastEmbeds(event, session);
  const isHost = !!session?.user?.id && session.user.id === event.hostId;

  if (!resolved) {
    return {
      broadcastIframeSrc: null,
      broadcastStageIframeSrc: null,
      broadcastMeetingIframeSrc: null,
      broadcastBreakoutDual: false,
      broadcastViewerIsHost: isHost,
    };
  }

  if (resolved.layout === "breakout-dual") {
    const stageSrc = resolved.stageSrc
      ? ensureTwitchPlayerParents(resolved.stageSrc, host)
      : null;
    const meetingSrc = resolved.meetingSrc
      ? ensureTwitchPlayerParents(resolved.meetingSrc, host)
      : null;
    return {
      broadcastIframeSrc: meetingSrc,
      broadcastStageIframeSrc: stageSrc,
      broadcastMeetingIframeSrc: meetingSrc,
      broadcastBreakoutDual: !!(stageSrc || meetingSrc),
      broadcastViewerIsHost: isHost,
    };
  }

  const src = resolved.src ? ensureTwitchPlayerParents(resolved.src, host) : null;
  return {
    broadcastIframeSrc: src,
    broadcastStageIframeSrc: null,
    broadcastMeetingIframeSrc: null,
    broadcastBreakoutDual: false,
    broadcastViewerIsHost: isHost,
  };
}
