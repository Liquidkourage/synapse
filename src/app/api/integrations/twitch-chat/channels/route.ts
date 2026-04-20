import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getTwitchChatBridgeTargets } from "@/lib/queries";

function authOk(request: Request): boolean {
  const secret = process.env.TWITCH_CHAT_INGEST_SECRET?.trim();
  if (!secret) return false;
  const hdr = request.headers.get("authorization");
  const token = hdr?.startsWith("Bearer ") ? hdr.slice(7).trim() : "";
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(secret, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Lists `{ channel, eventId }` for every **currently LIVE** Synapse event that has
 * `twitchChannelLogin` set. Used by `scripts/twitch-chat-bridge.mjs` (multi-tenant).
 */
export async function GET(request: Request) {
  if (!authOk(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await getTwitchChatBridgeTargets();
  return NextResponse.json({ channels });
}
