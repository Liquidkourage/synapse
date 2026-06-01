/** How Synapse configures the Daily.co room for an event. */
export type DailyVideoMode = "streaming" | "open" | "breakouts";

export function dailyVideoModeFromEvent(event: {
  broadcastBreakoutsEnabled?: boolean | null;
  broadcastStreamingMode?: boolean | null;
}): DailyVideoMode {
  if (event.broadcastBreakoutsEnabled) return "breakouts";
  if (event.broadcastStreamingMode ?? true) return "streaming";
  return "open";
}

export function videoRoomModeFromEvent(event: {
  broadcastBreakoutsEnabled?: boolean | null;
  broadcastStreamingMode?: boolean | null;
}): DailyVideoMode {
  return dailyVideoModeFromEvent(event);
}

export function parseVideoRoomModeForm(value: string | undefined): DailyVideoMode {
  if (value === "breakouts" || value === "open" || value === "streaming") return value;
  return "streaming";
}
