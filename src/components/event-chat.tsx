"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { postEventMessage } from "@/actions/chat";
import { clearPinnedEventAnnouncement, postEventAnnouncement } from "@/actions/announcements";
import type { ChatMessageClient } from "@/lib/chat-message-dto";

type Msg = ChatMessageClient;

// Note: Posting requires an account; guests may read.

function Submit({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        compact
          ? "rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          : "rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      }
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function EventChat({
  eventId,
  eventSlug,
  initialMessages,
  canManageAnnouncements = false,
  canPost = true,
  layout = "default",
}: {
  eventId: string;
  eventSlug: string;
  initialMessages: Msg[];
  canManageAnnouncements?: boolean;
  canPost?: boolean;
  /** `sideRail`: wide right column. `stageRail`: narrow ~15% column (tighter UI). `embedded`: mobile viewer tab. */
  layout?: "default" | "sideRail" | "embedded" | "stageRail";
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  // Chat posting requires an account; keep guest nickname helpers for backward compatibility if needed later.

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    // Prefer real-time stream; fallback to polling if unavailable.
    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollId) return;
      const tick = async () => {
        try {
          const res = await fetch(`/api/events/${eventId}/chat`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { messages: ChatMessageClient[] };
          setMessages(data.messages);
        } catch {
          /* ignore */
        }
      };
      pollId = setInterval(tick, 4000);
      void tick();
    };

    try {
      const afterChat = (initialMessages[initialMessages.length - 1]?.createdAt ?? new Date(0).toISOString()).toString();
      es = new EventSource(`/api/events/${eventId}/stream?afterChat=${encodeURIComponent(afterChat)}`);
      es.addEventListener("chat", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as { message?: ChatMessageClient };
          const m = parsed.message;
          if (!m) return;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        try {
          es?.close();
        } catch {
          /* ignore */
        }
        es = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      if (pollId) clearInterval(pollId);
    };
  }, [eventId, initialMessages]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const rail = layout === "sideRail";
  const stageRail = layout === "stageRail";
  const embedded = layout === "embedded";
  const railish = rail || stageRail;

  return (
    <section
      className={
        stageRail
          ? "flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"
          : rail
            ? "flex max-h-[min(520px,60vh)] min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 md:h-full md:max-h-none"
            : embedded
              ? "flex h-full min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
              : "rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6"
      }
    >
      <h2
        className={`font-medium text-white ${stageRail ? "text-sm" : rail || embedded ? "text-base" : "text-lg"}`}
      >
        Chat
      </h2>
      {canManageAnnouncements ? (
        <div className={`mt-2 rounded-lg border border-zinc-800 bg-zinc-950/40 ${stageRail ? "p-2" : "p-3"}`}>
          <p className={`${stageRail ? "text-[11px]" : "text-xs"} font-medium text-zinc-200`}>Announcement</p>
          <form
            className={`mt-2 flex gap-2 ${stageRail ? "flex-col" : "flex-col"}`}
            action={async (fd) => {
              await postEventAnnouncement(fd);
              setAnnouncementDraft("");
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="pinned" value="true" />
            <input
              name="body"
              required
              maxLength={300}
              value={announcementDraft}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              placeholder="Pinned note for everyone (e.g. “Join Team Blue breakout now”)"
              className={
                stageRail
                  ? "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
                  : "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              }
            />
            <div className="flex items-center gap-2">
              <Submit compact={stageRail} />
              <button
                type="button"
                onClick={() => setAnnouncementDraft("")}
                className={
                  stageRail
                    ? "rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900/60"
                    : "rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
                }
              >
                Clear text
              </button>
            </div>
          </form>
          <form
            className="mt-2"
            action={async (fd) => {
              await clearPinnedEventAnnouncement(fd);
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              className={`${stageRail ? "text-[11px]" : "text-xs"} text-zinc-400 hover:text-zinc-200`}
            >
              Remove pinned announcement
            </button>
          </form>
        </div>
      ) : null}
      {!stageRail ? (
        <p
          className={`text-zinc-500 ${rail ? "mt-1 line-clamp-2 text-xs" : embedded ? "mt-1 line-clamp-2 text-xs" : "mt-1 text-sm"}`}
        >
          {rail || embedded
            ? "Synapse + Twitch (when configured) in one feed; Synapse posts can mirror to your Twitch relay bot. Sign in to post with your name."
            : "Synapse + Twitch (when configured) in one feed — no account needed to read; sign in to post on Synapse with your name. With merged chat, Synapse lines can appear in Twitch from your relay bot (e.g. SynapseChat)."}
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">Sign in to post. Twitch merge when configured.</p>
      )}
      <ul
        ref={listRef}
        className={`space-y-2 overflow-y-auto ${stageRail ? "mt-2 min-h-0 flex-1 text-xs" : railish || embedded ? "mt-3 min-h-0 flex-1 text-sm" : "mt-4 max-h-72 text-sm"}`}
      >
        {messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-lg px-3 py-2 ${m.source === "twitch" ? "border border-purple-900/40 bg-purple-950/30" : "bg-zinc-900/80"}`}
          >
            {m.source === "twitch" && (
              <span className="mr-2 inline-block rounded bg-purple-600/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-purple-200">
                Twitch
              </span>
            )}
            <span className="font-medium text-violet-300">{m.author}</span>
            <span className="text-zinc-600"> · </span>
            <span className="text-zinc-300">{m.body}</span>
          </li>
        ))}
        {messages.length === 0 && <li className="text-zinc-500">Be the first to say hi.</li>}
      </ul>
      <form
        className={`flex flex-col gap-2 ${stageRail ? "mt-2 shrink-0 border-t border-zinc-800/80 pt-2" : railish || embedded ? "sm:flex-row mt-3 shrink-0 border-t border-zinc-800/80 pt-3" : "mt-4 sm:flex-row"}`}
        action={async (fd) => {
          await postEventMessage(fd);
          const res = await fetch(`/api/events/${eventId}/chat`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { messages: ChatMessageClient[] };
            setMessages(data.messages);
          }
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="eventSlug" value={eventSlug} />
        {canPost ? (
          <>
            <input
              name="body"
              required
              placeholder={stageRail ? "Message…" : "Say something nice…"}
              className={
                stageRail
                  ? "min-h-[2.25rem] min-w-0 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
                  : "min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              }
            />
            <Submit compact={stageRail} />
          </>
        ) : (
          <p className={`${stageRail ? "text-[11px]" : "text-xs"} text-zinc-500`}>
            Sign in to send messages.
          </p>
        )}
      </form>
    </section>
  );
}
