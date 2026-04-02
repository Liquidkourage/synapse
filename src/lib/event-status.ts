import type { Event, EventStatus } from "@/generated/prisma";

/**
 * Effective status: manual override wins (except terminal states),
 * otherwise time-based inference from stored `status` + window.
 */
export function getEffectiveEventStatus(
  event: Pick<Event, "status" | "statusOverride" | "startAt" | "endAt">,
  now: Date = new Date(),
): EventStatus {
  if (event.status === "CANCELLED" || event.status === "ARCHIVED") {
    return event.status;
  }
  if (event.statusOverride) {
    return event.statusOverride;
  }
  if (event.status === "DRAFT") {
    return "DRAFT";
  }
  if (now < event.startAt) {
    return "SCHEDULED";
  }
  if (now >= event.startAt && now <= event.endAt) {
    return "LIVE";
  }
  return "COMPLETED";
}

export function statusLabel(s: EventStatus): string {
  const map: Record<EventStatus, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    LIVE: "Live",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
    CANCELLED: "Canceled",
  };
  return map[s] ?? s;
}
