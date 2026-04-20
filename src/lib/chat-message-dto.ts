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
  user: { name: string | null; email: string | null } | null;
};

export function toChatMessageClient(m: Row): ChatMessageClient {
  const source = m.chatSource === "twitch" ? "twitch" : "synapse";
  const author = m.user?.name?.trim() || m.user?.email?.trim() || m.guestName?.trim() || "Guest";
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    author,
    source,
  };
}
