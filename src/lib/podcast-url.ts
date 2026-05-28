/** How a pasted podcast URL should be handled on import. */
export type PodcastUrlKind = "rss" | "show" | "episode";

export function classifyPodcastUrl(raw: string): PodcastUrlKind {
  const trimmed = raw.trim();
  if (!trimmed) return "episode";

  if (looksLikeRssFeedUrl(trimmed)) return "rss";

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "open.spotify.com") {
      const type = u.pathname.split("/").filter(Boolean)[0];
      if (type === "show") return "show";
      return "episode";
    }

    if (host === "podcasts.apple.com") {
      if (u.searchParams.has("i")) return "episode";
      const path = u.pathname.toLowerCase();
      if (path.includes("/podcast/")) return "show";
      return "episode";
    }

    if (host.includes("youtube.com") || host === "youtu.be") {
      const path = u.pathname.toLowerCase();
      if (path.includes("/playlist") || path.includes("/channel") || path.includes("/@")) return "show";
      return "episode";
    }
  } catch {
    return "episode";
  }

  return "episode";
}

export function looksLikeRssFeedUrl(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (lower.endsWith(".xml") || lower.includes(".xml?")) return true;
  if (lower.includes("/feed") || lower.includes("/rss")) return true;
  if (lower.includes("feeds.") || lower.includes("feed.")) return true;
  return false;
}

export function applePodcastIdFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/id(\d+)/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function spotifyShowIdFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname.replace(/^www\./, "") !== "open.spotify.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "show" && parts[1]) return parts[1];
    if (parts[0] === "embed" && parts[1] === "show" && parts[2]) return parts[2];
    return null;
  } catch {
    return null;
  }
}
