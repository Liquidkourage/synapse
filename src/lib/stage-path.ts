/** Routes that use the full viewport stage grid (~15 / 70 / 15). */
export function isStagePath(pathname: string): boolean {
  return (
    pathname === "/live" ||
    pathname.startsWith("/live/") ||
    /^\/events\/[^/]+$/.test(pathname)
  );
}
