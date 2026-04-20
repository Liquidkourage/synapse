/**
 * Twitch iframe embeds require parent=<hostname> for the page that embeds player.twitch.tv.
 * Hosts often save a URL with the wrong parent after deploy (preview URL, www vs apex, etc.).
 * @see https://dev.twitch.tv/docs/embed/video-and-clips/
 */

function hostnameVariants(host: string): string[] {
  const h = host.trim().toLowerCase().split(":")[0] ?? "";
  if (!h || h === "localhost") return [h];
  const out = new Set<string>([h]);
  if (h.startsWith("www.")) out.add(h.slice(4));
  else out.add(`www.${h}`);
  return [...out];
}

/**
 * For `player.twitch.tv` URLs, ensure `parent` includes this request's hostname (and www/apex variant).
 * Other URLs are returned unchanged.
 */
export function ensureTwitchPlayerParents(embedUrl: string, requestHostname: string | null | undefined): string {
  const host = requestHostname?.trim();
  if (!host) return embedUrl;

  try {
    const u = new URL(embedUrl);
    if (u.hostname !== "player.twitch.tv") return embedUrl;

    const existing = u.searchParams.getAll("parent").map((p) => p.trim().toLowerCase());
    for (const variant of hostnameVariants(host)) {
      if (!variant) continue;
      if (!existing.includes(variant)) {
        u.searchParams.append("parent", variant);
        existing.push(variant);
      }
    }
    return u.toString();
  } catch {
    return embedUrl;
  }
}
