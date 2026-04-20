/**
 * Relay Synapse chat lines to Twitch via Helix Send Chat Message.
 * Requires TWITCH_BOT_OAUTH on the web process (same bot as the IRC bridge).
 * Token must include scope: user:write:chat (regenerate OAuth if you only had chat:read).
 *
 * Bot-sent lines are ignored by twitch-chat-bridge.mjs (`self` on tmi.js).
 */

const TWITCH_MSG_MAX = 500;

function bearerToken(raw: string): string {
  const t = raw.trim();
  if (t.toLowerCase().startsWith("oauth:")) return t.slice(6);
  return t;
}

function formatRelayLine(authorLabel: string, body: string): string {
  const prefix = `[Synapse] ${authorLabel}: `;
  const rest = body.trim();
  let line = prefix + rest;
  if (line.length <= TWITCH_MSG_MAX) return line;
  const budget = TWITCH_MSG_MAX - prefix.length - 1;
  return prefix + (budget > 0 ? rest.slice(0, budget) + "…" : rest.slice(0, TWITCH_MSG_MAX));
}

export async function relaySynapseChatToTwitch(params: {
  twitchChannelLogin: string;
  authorLabel: string;
  body: string;
}): Promise<void> {
  const raw = process.env.TWITCH_BOT_OAUTH?.trim();
  if (!raw) return;

  const token = bearerToken(raw);
  const login = params.twitchChannelLogin.trim().toLowerCase();
  if (!login) return;

  try {
    const valRes = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!valRes.ok) return;
    const val = (await valRes.json()) as {
      client_id?: string;
      user_id?: string;
      scopes?: string[];
    };
    const clientId = val.client_id?.trim();
    const senderId = val.user_id?.trim();
    if (!clientId || !senderId) return;
    if (Array.isArray(val.scopes) && val.scopes.length > 0 && !val.scopes.includes("user:write:chat")) {
      console.error(
        "[twitch-send-chat] Token missing user:write:chat; regenerate the bot OAuth token with that scope.",
      );
      return;
    }

    const usersRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": clientId,
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
        Authorization: `Bearer ${token}`,
        "Client-Id": clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        sender_id: senderId,
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
