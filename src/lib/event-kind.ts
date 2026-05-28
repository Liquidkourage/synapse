import type { EventKind } from "@/generated/prisma";

export const EVENT_KIND_OPTIONS: { value: EventKind; label: string; description: string }[] = [
  {
    value: "LIVE_INTERACTIVE",
    label: "Live interactive show",
    description: "Trivia, games, or tools with live video and embeds during the event window.",
  },
  {
    value: "PODCAST",
    label: "Podcast episode",
    description: "On-demand listen — embedded player on the event page and in the podcasts directory.",
  },
];

export function eventKindLabel(kind: EventKind): string {
  return EVENT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

/** Legacy rows may only have podcastEmbedUrl; treat as podcast in UI and listings. */
export function effectiveEventKind(event: { eventKind: EventKind; podcastEmbedUrl: string | null }): EventKind {
  if (event.eventKind === "PODCAST") return "PODCAST";
  if (event.podcastEmbedUrl?.trim()) return "PODCAST";
  return "LIVE_INTERACTIVE";
}

export function isPodcastEvent(event: { eventKind: EventKind; podcastEmbedUrl: string | null }): boolean {
  return effectiveEventKind(event) === "PODCAST";
}
