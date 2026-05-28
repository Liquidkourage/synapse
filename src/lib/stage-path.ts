/** Routes that use the full viewport stage grid (~15 / 70 / 15). Podcast /events/[slug] uses a listen layout instead. */
export function isStagePath(pathname: string): boolean {
  return pathname === "/live" || pathname.startsWith("/live/") || isLiveEventStagePath(pathname);
}

export function isLiveEventStagePath(pathname: string): boolean {
  return /^\/events\/[^/]+$/.test(pathname);
}

