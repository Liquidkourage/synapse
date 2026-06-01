import { isDailyNativeBroadcastUrl } from "@/lib/synapse-video";
import { isZoomNativeEvent } from "@/lib/zoom-meetings";

export type BroadcastVideoProvider = "daily" | "zoom" | "custom";

export function broadcastVideoProviderFromEvent(event: {
  broadcastVideoProvider?: string | null;
  broadcastEmbedUrl?: string | null;
  zoomMeetingNumber?: string | null;
}): BroadcastVideoProvider {
  if (isZoomNativeEvent(event)) return "zoom";
  if (event.broadcastEmbedUrl && isDailyNativeBroadcastUrl(event.broadcastEmbedUrl)) return "daily";
  if (event.broadcastEmbedUrl?.trim()) return "custom";
  return (event.broadcastVideoProvider as BroadcastVideoProvider) || "daily";
}

export function parseBroadcastVideoProviderForm(value: string | undefined): BroadcastVideoProvider {
  if (value === "zoom" || value === "custom" || value === "daily") return value;
  return "daily";
}
