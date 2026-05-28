import { getStreamEmbedUrl } from "@/lib/video-embed";

export type PodcastEmbed =
  | { kind: "iframe"; src: string; aspect: "compact" | "video" }
  | { kind: "audio"; src: string };

const AUDIO_EXT = /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i;

/**
 * Resolve a public podcast link to an embeddable player (Spotify, Apple Podcasts, YouTube)
 * or a direct audio file URL.
 */
export function resolvePodcastEmbed(raw: string | null | undefined): PodcastEmbed | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;

    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (AUDIO_EXT.test(u.pathname) || u.pathname.endsWith("/audio")) {
      return { kind: "audio", src: u.toString() };
    }

    if (host === "open.spotify.com") {
      const embed = spotifyEmbedUrl(u);
      if (embed) return { kind: "iframe", src: embed, aspect: "compact" };
    }

    if (host === "podcasts.apple.com") {
      const embed = applePodcastsEmbedUrl(u);
      if (embed) return { kind: "iframe", src: embed, aspect: "compact" };
    }

    if (host === "embed.podcasts.apple.com") {
      return { kind: "iframe", src: u.toString(), aspect: "compact" };
    }

    const yt = getStreamEmbedUrl(trimmed);
    if (yt) return { kind: "iframe", src: yt, aspect: "video" };

    if (host.includes("youtube.com") || host === "youtu.be") {
      return null;
    }

    /** Already an iframe embed URL from the host (Spotify embed path, etc.). */
    if (u.pathname.includes("/embed/")) {
      return { kind: "iframe", src: u.toString(), aspect: "compact" };
    }
  } catch {
    return null;
  }

  return null;
}

function spotifyEmbedUrl(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed" && parts.length >= 2) {
    return u.toString();
  }
  const type = parts[0];
  const id = parts[1];
  if (!id || !["episode", "show", "track", "playlist", "album"].includes(type)) {
    return null;
  }
  const out = new URL(u.toString());
  out.pathname = `/embed/${type}/${id}`;
  out.search = "";
  out.hash = "";
  return out.toString();
}

function applePodcastsEmbedUrl(u: URL): string | null {
  if (!u.pathname.includes("/podcast/") && !u.pathname.includes("/id")) {
    return null;
  }
  const out = new URL(u.toString());
  out.hostname = "embed.podcasts.apple.com";
  return out.toString();
}

/** User-facing hint when URL cannot be embedded. */
export function podcastEmbedRejectedReason(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (resolvePodcastEmbed(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("spotify") || host.includes("apple.com") || host.includes("youtube")) {
      return "Use a public episode or show link from Spotify, Apple Podcasts, or YouTube (not a private or app-only link).";
    }
  } catch {
    return "Enter a valid https URL.";
  }
  return "Supported: Spotify, Apple Podcasts, YouTube, or a direct https link to an audio file (.mp3, .m4a, …).";
}
