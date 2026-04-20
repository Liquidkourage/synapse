import { headers } from "next/headers";

/**
 * Public hostname for the current request (no port). Used for Twitch embed parent= injection.
 */
export async function getRequestHostnameForEmbeds(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-forwarded-host") ?? h.get("host");
  if (raw) {
    return raw.split(":")[0]?.toLowerCase() ?? null;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_HOSTNAME?.trim();
  return fromEnv ? fromEnv.split(":")[0].toLowerCase() : null;
}
