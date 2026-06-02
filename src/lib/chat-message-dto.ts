export type ChatMessageClient = {
  id: string;
  body: string;
  createdAt: string;
  author: string;
  source: "synapse" | "twitch";
};

type Row = {
  id: string;
  body: string;
  createdAt: Date;
  chatSource: string;
  guestName: string | null;
  user:
    | { name: string | null; email: string | null; profile?: { displayName: string | null } | null }
    | null;
};

function coerceHandleFromEmail(email: string | null | undefined): string | null {
  const e = email?.trim();
  if (!e) return null;
  const at = e.indexOf("@");
  const prefix = (at >= 1 ? e.slice(0, at) : e).trim();
  if (!prefix) return null;
  // Keep it conservative (no spaces), but don't over-police.
  return prefix.replace(/\s+/g, "");
}

export function toChatMessageClient(m: Row): ChatMessageClient {
  const source = m.chatSource === "twitch" ? "twitch" : "synapse";
  const author =
    m.user?.profile?.displayName?.trim() ||
    m.user?.name?.trim() ||
    coerceHandleFromEmail(m.user?.email) ||
    m.guestName?.trim() ||
    "User";
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    author,
    source,
  };
}
