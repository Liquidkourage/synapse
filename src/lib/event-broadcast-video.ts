import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { isZoomNativeEvent } from "@/lib/zoom-meetings";

/** Event has a configured live video source (Zoom, Daily, or custom URL). */
export function eventHasBroadcastVideo(event: {
  broadcastEmbedUrl?: string | null;
  broadcastVideoProvider?: string | null;
  zoomMeetingNumber?: string | null;
}): boolean {
  if (isZoomNativeEvent(event) && event.zoomMeetingNumber) return true;
  return !!event.broadcastEmbedUrl?.trim();
}

export type EventBroadcastInput = {
  id: string;
  hostId: string;
  producerId: string | null;
  broadcastEmbedUrl: string | null;
  broadcastHostOnlyJoin?: boolean | null;
  broadcastStreamingMode?: boolean | null;
  broadcastBreakoutsEnabled?: boolean | null;
  broadcastVideoProvider?: string | null;
  zoomMeetingNumber?: string | null;
};

export function eventBroadcastInputFromEvent(event: EventBroadcastInput) {
  return event;
}

export { isDailyNativeBroadcastUrl };
