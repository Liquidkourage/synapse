"use client";

import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { postEventMessage } from "@/actions/chat";
import type { ChatMessageClient } from "@/lib/chat-message-dto";

type Msg = ChatMessageClient;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function EventChat({
  eventId,
  eventSlug,
  initialMessages,
  layout = "default",
}: {
  eventId: string;
  eventSlug: string;
  initialMessages: Msg[];
  /** `sideRail`: tall column for live / theater layouts (chat on the right). */
  layout?: "default" | "sideRail";
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/chat`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { messages: ChatMessageClient[] };
        setMessages(data.messages);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventId]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const rail = layout === "sideRail";

  return (
    <section
      className={
        rail
          ? "flex max-h-[min(520px,60vh)] min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 md:h-full md:max-h-none"
          : "rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6"
      }
    >
      <h2 className={`font-medium text-white ${rail ? "text-base" : "text-lg"}`}>Chat</h2>
      <p className={`text-zinc-500 ${rail ? "mt-1 line-clamp-2 text-xs" : "mt-1 text-sm"}`}>
        {rail
          ? "Synapse + Twitch (when configured) in one feed; Synapse posts can mirror to Twitch as the bot. Sign in to post with your name."
          : "Synapse + Twitch (when configured) in one feed — no account needed to read; sign in to post on Synapse with your name. With Twitch merged chat, Synapse lines can appear in Twitch as the bot."}
      </p>
      <ul
        ref={listRef}
        className={`mt-3 space-y-2 overflow-y-auto text-sm ${rail ? "min-h-0 flex-1" : "mt-4 max-h-72"}`}
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
        className={`flex flex-col gap-2 sm:flex-row ${rail ? "mt-3 shrink-0 border-t border-zinc-800/80 pt-3" : "mt-4"}`}
        action={async (fd) => {
          await postEventMessage(fd);
          router.refresh();
          const res = await fetch(`/api/events/${eventId}/chat`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { messages: ChatMessageClient[] };
            setMessages(data.messages);
          }
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="eventSlug" value={eventSlug} />
        <input
          name="guestName"
          placeholder="Nickname (guests)"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 sm:w-40"
        />
        <input
          name="body"
          required
          placeholder="Say something nice…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
        <Submit />
      </form>
    </section>
  );
}
