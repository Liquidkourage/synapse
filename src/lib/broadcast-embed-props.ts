import type { Session } from "next-auth";
import { getBroadcastEmbedPageProps as getDailyBroadcastEmbedPageProps } from "@/lib/daily-broadcast-embed-props";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { resolveZoomHostStageEmbedUrl } from "@/lib/daily-broadcast-url";
import { isZoomNativeEvent } from "@/lib/zoom-meetings";

type EventForBroadcast = {
  id: string;
  hostId: string;
  producerId: string | null;
  broadcastEmbedUrl: string | null;
  broadcastHostOnlyJoin?: boolean | null;
  broadcastStreamingMode?: boolean | null;
  broadcastBreakoutsEnabled?: boolean | null;
  broadcastVideoProvider?: string | null;
  zoomMeetingNumber?: string | null;
  zoomHostStageRoomUrl?: string | null;
};

export type BroadcastEmbedPageProps = {
  broadcastIframeSrc: string | null;
  broadcastStageIframeSrc: string | null;
  broadcastMeetingIframeSrc: string | null;
  broadcastBreakoutDual: boolean;
  broadcastViewerIsHost: boolean;
  broadcastZoomEventId: string | null;
};

export async function getBroadcastEmbedPageProps(
  event: EventForBroadcast,
  session: Session | null,
  hostForEmbeds: string | null,
): Promise<BroadcastEmbedPageProps> {
  const isHost = !!session?.user?.id && session.user.id === event.hostId;

  if (isZoomNativeEvent(event) && event.zoomMeetingNumber) {
    const canView = canViewBroadcastEmbed(
      {
        hostId: event.hostId,
        producerId: event.producerId,
        broadcastHostOnlyJoin: event.broadcastHostOnlyJoin ?? false,
      },
      session,
    );
    const display =
      session?.user?.name?.trim() || session?.user?.email?.trim() || (isHost ? "Host" : "Guest");
    let broadcastBreakoutDual = false;
    let broadcastStageIframeSrc: string | null = null;
    if (isHost && event.broadcastBreakoutsEnabled && event.zoomHostStageRoomUrl) {
      broadcastStageIframeSrc = await resolveZoomHostStageEmbedUrl(
        event.zoomHostStageRoomUrl,
        display,
      );
      broadcastBreakoutDual = !!broadcastStageIframeSrc;
    }
    return {
      broadcastIframeSrc: null,
      broadcastStageIframeSrc,
      broadcastMeetingIframeSrc: null,
      broadcastBreakoutDual,
      broadcastViewerIsHost: isHost,
      broadcastZoomEventId: canView ? event.id : null,
    };
  }

  const daily = await getDailyBroadcastEmbedPageProps(event, session, hostForEmbeds);
  return { ...daily, broadcastZoomEventId: null };
}
