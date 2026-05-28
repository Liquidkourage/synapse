/** Short platform label for podcast URL badges. */
export function podcastPlatformLabel(url: string | null | undefined): string {
  if (!url?.trim()) return "Podcast";
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("spotify")) return "Spotify";
    if (host.includes("apple.com")) return "Apple Podcasts";
    if (host.includes("youtube") || host === "youtu.be") return "YouTube";
    if (/\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(new URL(url).pathname)) return "Audio";
  } catch {
    /* */
  }
  return "Podcast";
}
