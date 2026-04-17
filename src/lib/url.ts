/**
 * Browsers resolve href/src without a scheme relative to the current origin, so
 * `got.example.com/player` becomes `https://current-site.com/got.example.com/player`.
 * Ensures http(s) URLs for links and iframe sources.
 */
export function ensureHttpUrl(url: string | undefined | null): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;

  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t; // ftp://, etc.
  if (/^(mailto|tel|javascript|data):/i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  return `https://${t}`;
}
