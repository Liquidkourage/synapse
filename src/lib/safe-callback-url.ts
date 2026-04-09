/**
 * Only allow same-origin relative redirects after login (blocks //evil.com, https://… off-site, etc.).
 */
export function safeCallbackUrl(input: string | undefined, baseOrigin: string): string {
  if (!input || input === "/") return "/";
  const trimmed = input.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const resolved = new URL(trimmed, baseOrigin);
    const base = new URL(baseOrigin);
    if (resolved.origin === base.origin) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}` || "/";
    }
  } catch {
    return "/";
  }
  return "/";
}
