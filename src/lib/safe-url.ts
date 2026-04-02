/** Reject javascript:, data:, etc. for iframe src. */
export function isSafeUrlForIframe(s: string | null | undefined): boolean {
  if (!s?.trim()) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
