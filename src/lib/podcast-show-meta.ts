/** Best show title from imported episode metadata (not the Synapse host display name). */
export function displayPodcastShowTitle(
  episodes: { podcastShowTitle?: string | null }[],
  hostFallback: string,
): string {
  const fromFeed = episodes.find((e) => e.podcastShowTitle?.trim())?.podcastShowTitle?.trim();
  return fromFeed || hostFallback;
}

export function podcastShowPath(hostId: string, feedUrl?: string | null): string {
  const base = `/podcasts/shows/${hostId}`;
  if (feedUrl?.trim()) return `${base}?feed=${encodeURIComponent(feedUrl.trim())}`;
  return base;
}
