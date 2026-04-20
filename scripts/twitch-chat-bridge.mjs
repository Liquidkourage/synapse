/**
 * Long-running process: join Twitch IRC as a bot and POST each chat line to Synapse ingest.
 *
 * Required env:
 *   TWITCH_BOT_USERNAME   — bot account login (separate from broadcaster; needs read chat)
 *   TWITCH_BOT_OAUTH      — oauth token for the bot, e.g. oauth:xxxxxxxx from https://twitchtokengenerator.com/ (scope: chat:read minimum)
 *   TWITCH_BRIDGE_CHANNEL — channel login without # (e.g. triviaworkshop)
 *   TWITCH_BRIDGE_EVENT_ID — Prisma event id (from host UI URL or DB)
 *   TWITCH_BRIDGE_INGEST_URL — full URL to POST, e.g. https://yoursite.com/api/integrations/twitch-chat/ingest
 *   TWITCH_CHAT_INGEST_SECRET — same value as server .env TWITCH_CHAT_INGEST_SECRET
 *
 * Run: node scripts/twitch-chat-bridge.mjs
 *
 * Serverless hosts (e.g. Vercel) cannot run this; use Railway, Fly, a VPS, or your laptop during the show.
 */

import tmi from "tmi.js";

const channel = process.env.TWITCH_BRIDGE_CHANNEL?.replace(/^#/, "").trim();
const eventId = process.env.TWITCH_BRIDGE_EVENT_ID?.trim();
const ingestUrl = process.env.TWITCH_BRIDGE_INGEST_URL?.trim();
const secret = process.env.TWITCH_CHAT_INGEST_SECRET?.trim();
const oauth = process.env.TWITCH_BOT_OAUTH?.trim();
const botUser = process.env.TWITCH_BOT_USERNAME?.trim();

if (!channel || !eventId || !ingestUrl || !secret || !oauth || !botUser) {
  console.error("Missing env. See script header in scripts/twitch-chat-bridge.mjs");
  process.exit(1);
}

const client = new tmi.Client({
  options: { skipUpdatingEmotesets: true },
  connection: { reconnect: true, secure: true },
  identity: { username: botUser, password: oauth.startsWith("oauth:") ? oauth : `oauth:${oauth}` },
  channels: [channel],
});

client.on("message", async (ch, tags, message, self) => {
  if (self) return;
  const externalId = tags.id || `${tags["tmi-sent-ts"] ?? ""}-${tags["user-id"] ?? ""}-${message.slice(0, 32)}`;
  const author = tags["display-name"] || tags.username || "unknown";
  try {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        eventId,
        channel,
        externalId,
        author,
        body: message,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[ingest]", res.status, t.slice(0, 200));
    }
  } catch (e) {
    console.error("[ingest] fetch failed", e);
  }
});

client.on("connected", () => {
  console.log(`[twitch-chat-bridge] connected, mirroring #${channel} → event ${eventId}`);
});

client.connect().catch((e) => {
  console.error(e);
  process.exit(1);
});
