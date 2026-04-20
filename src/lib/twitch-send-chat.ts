/**
 * Relay Synapse chat lines to Twitch via Helix Send Chat Message.
 * Uses getTwitchBotHelixContext() (validate + optional refresh_token rotation).
 *
 * Bot-sent lines are ignored by twitch-chat-bridge.mjs (`self` on tmi.js).
 */

import { getTwitchBotHelixContext } from "@/lib/twitch-bot-token";

const TWITCH_MSG_MAX = 500;

/** Bot name in Twitch already marks the source (e.g. SynapseChat); no extra [Synapse] tag. */
function formatRelayLine(authorLabel: string, body: string): string {
  const prefix = `${authorLabel}: `;
  const rest = body.trim();
  const line = prefix + rest;
  if (line.length <= TWITCH_MSG_MAX) return line;
  const budget = TWITCH_MSG_MAX - prefix.length - 1;
  return prefix + (budget > 0 ? rest.slice(0, budget) + "…" : rest.slice(0, TWITCH_MSG_MAX));
}

export async function relaySynapseChatToTwitch(params: {
  twitchChannelLogin: string;
  authorLabel: string;
  body: string;
}): Promise<void> {
  const login = params.twitchChannelLogin.trim().toLowerCase();
  if (!login) return;

  try {
    const ctx = await getTwitchBotHelixContext();
    if (!ctx) return;

    if (ctx.scopes.length > 0 && !ctx.scopes.includes("user:write:chat")) {
      console.error(
        "[twitch-send-chat] Token missing user:write:chat; regenerate the bot OAuth token with that scope.",
      );
      return;
    }

    const usersRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      {
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          "Client-Id": ctx.clientId,
        },
      },
    );
    if (!usersRes.ok) return;
    const usersJson = (await usersRes.json()) as {
      data?: { id: string }[];
    };
    const broadcasterId = usersJson.data?.[0]?.id;
    if (!broadcasterId) return;

    const message = formatRelayLine(params.authorLabel, params.body);

    const sendRes = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Client-Id": ctx.clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        sender_id: ctx.userId,
        message,
      }),
    });

    if (!sendRes.ok) {
      const t = await sendRes.text();
      console.error("[twitch-send-chat]", sendRes.status, t.slice(0, 300));
      return;
    }
    const payload = (await sendRes.json()) as {
      data?: { is_sent?: boolean; drop_reason?: unknown }[];
    };
    const row = payload.data?.[0];
    if (row && row.is_sent === false) {
      console.error("[twitch-send-chat] not sent", row.drop_reason);
    }
  } catch (e) {
    console.error("[twitch-send-chat]", e);
  }
}
