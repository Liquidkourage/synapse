import type { PodcastEpisodeRow } from "@/lib/podcast-queries";

/** Label for the podcast series on cards (not the host display name). */
export function episodeShowLabel(episode: Pick<PodcastEpisodeRow, "podcastShowTitle" | "host">): string {
  const show = episode.podcastShowTitle?.trim();
  if (show) return show;
  return episode.host.name?.trim() || episode.host.email;
}
