import type { BroadcastVideoProvider } from "@/lib/broadcast-video-provider";

/** Host-facing video stack for live events (not custom embed). */
export type LiveVideoRoute = "daily" | "zoom";

export function liveVideoRouteFromProvider(provider: BroadcastVideoProvider): LiveVideoRoute | null {
  if (provider === "daily") return "daily";
  if (provider === "zoom") return "zoom";
  return null;
}

export function broadcastProviderForRoute(route: LiveVideoRoute): BroadcastVideoProvider {
  return route;
}
