/** Normalize stored handle and build a Venmo web URL (deep link to profile/pay in browser or app). */
export function normalizeVenmoHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^@+/, "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (s.length > 60) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return null;
  return s;
}

export function venmoProfileUrl(handle: string): string {
  return `https://venmo.com/${encodeURIComponent(handle)}`;
}
