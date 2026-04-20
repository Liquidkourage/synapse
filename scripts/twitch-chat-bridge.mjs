/**
 * Multi-tenant Twitch → Synapse chat bridge (long-running).
 *
 * Polls your Synapse API for every **LIVE** event that has **Twitch channel (merged chat)** set,
 * joins those Twitch channels as one bot, and POSTs each line to ingest.
 *
 * Required env:
 *   TWITCH_BOT_USERNAME
 *   TWITCH_BOT_OAUTH          — oauth:… token for the bot (chat:read / read chat)
 *   TWITCH_CHAT_INGEST_SECRET — same as server (Bearer for API + ingest)
 *   TWITCH_BRIDGE_CHANNELS_URL — GET, e.g. https://yoursite.com/api/integrations/twitch-chat/channels
 *   TWITCH_BRIDGE_INGEST_URL   — POST, e.g. https://yoursite.com/api/integrations/twitch-chat/ingest
 *
 * Optional:
 *   TWITCH_BRIDGE_POLL_MS — default 45000 (refresh channel list / join-part)
 *
 * Run: npm run twitch-bridge
 *
 * Railway: one worker service; no per-host env. Hosts only set **Twitch channel** on their event in Synapse.
 */

import tmi from "tmi.js";

const channelsUrl = process.env.TWITCH_BRIDGE_CHANNELS_URL?.trim();
const ingestUrl = process.env.TWITCH_BRIDGE_INGEST_URL?.trim();
const secret = process.env.TWITCH_CHAT_INGEST_SECRET?.trim();
const oauth = process.env.TWITCH_BOT_OAUTH?.trim();
const botUser = process.env.TWITCH_BOT_USERNAME?.trim();
const pollMs = Math.max(15_000, Number(process.env.TWITCH_BRIDGE_POLL_MS) || 45_000);

const required = [
  ["TWITCH_BRIDGE_CHANNELS_URL", channelsUrl],
  ["TWITCH_BRIDGE_INGEST_URL", ingestUrl],
  ["TWITCH_CHAT_INGEST_SECRET", secret],
  ["TWITCH_BOT_OAUTH", oauth],
  ["TWITCH_BOT_USERNAME", botUser],
];
const missing = required.filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(
    `Missing env (${missing.join(", ")}). All required: ${required.map(([k]) => k).join(", ")}`,
  );
  process.exit(1);
}

/** @type {Map<string, string>} */
let channelToEvent = new Map();
/** @type {Set<string>} */
let joined = new Set();

async function fetchTargets() {
  const res = await fetch(channelsUrl, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    throw new Error(`channels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.channels) ? data.channels : [];
  return list
    .filter((x) => x && typeof x.channel === "string" && typeof x.eventId === "string")
    .map((x) => ({ channel: x.channel.replace(/^#/, "").trim().toLowerCase(), eventId: x.eventId.trim() }));
}

const client = new tmi.Client({
  options: { skipUpdatingEmotesets: true },
  connection: { reconnect: true, secure: true },
  identity: { username: botUser, password: oauth.startsWith("oauth:") ? oauth : `oauth:${oauth}` },
  channels: [],
});

client.on("message", async (channel, tags, message, self) => {
  if (self) return;
  const ch = channel.replace(/^#/, "").toLowerCase();
  const eventId = channelToEvent.get(ch);
  if (!eventId) return;

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
        channel: ch,
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

async function syncJoinState() {
  const targets = await fetchTargets();
  channelToEvent = new Map(targets.map((t) => [t.channel, t.eventId]));
  const want = new Set(targets.map((t) => t.channel));

  for (const c of joined) {
    if (!want.has(c)) {
      try {
        await client.part(c);
      } catch (e) {
        console.warn("[part]", c, e);
      }
      joined.delete(c);
    }
  }
  for (const c of want) {
    if (!joined.has(c)) {
      try {
        await client.join(c);
        joined.add(c);
      } catch (e) {
        console.warn("[join]", c, e);
      }
    }
  }

  console.log(
    `[twitch-chat-bridge] sync: ${want.size} channel(s) →`,
    [...want].join(", ") || "(none — waiting for LIVE events with Twitch channel set)",
  );
}

client.on("connected", async () => {
  console.log("[twitch-chat-bridge] IRC connected as", botUser);
  try {
    await syncJoinState();
  } catch (e) {
    console.error("[twitch-chat-bridge] initial sync failed", e);
  }
});

setInterval(() => {
  syncJoinState().catch((e) => console.error("[twitch-chat-bridge] poll failed", e));
}, pollMs);

client.connect().catch((e) => {
  console.error(e);
  process.exit(1);
});
