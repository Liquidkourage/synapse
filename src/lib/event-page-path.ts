import type { Event } from "@/generated/prisma";
import { isPodcastEvent } from "@/lib/event-kind";

/** Canonical public URL for an event (podcasts use /podcasts/e/…). */
export function eventPublicPath(event: Pick<Event, "slug" | "eventKind" | "podcastEmbedUrl">): string {
  return isPodcastEvent(event) ? `/podcasts/e/${event.slug}` : `/events/${event.slug}`;
}

/** Revalidate both legacy and canonical paths after event updates. */
export function revalidateEventPublicPaths(
  revalidatePath: (path: string) => void,
  event: Pick<Event, "slug" | "eventKind" | "podcastEmbedUrl">,
): void {
  revalidatePath(`/events/${event.slug}`);
  if (isPodcastEvent(event)) {
    revalidatePath(`/podcasts/e/${event.slug}`);
    revalidatePath("/podcasts");
    revalidatePath("/podcasts/episodes");
  }
}
