"use client";

import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { postEventMessage } from "@/actions/chat";

type Msg = { id: string; body: string; createdAt: string; author: string };

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
}: {
  eventId: string;
  eventSlug: string;
  initialMessages: Msg[];
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
        const data = (await res.json()) as { messages: Msg[] };
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

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-lg font-medium text-white">Event chat</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Lobby chat updates every few seconds — no account needed to read; sign in to post with your name.
      </p>
      <ul ref={listRef} className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg bg-zinc-900/80 px-3 py-2">
            <span className="font-medium text-violet-300">{m.author}</span>
            <span className="text-zinc-600"> · </span>
            <span className="text-zinc-300">{m.body}</span>
          </li>
        ))}
        {messages.length === 0 && <li className="text-zinc-500">Be the first to say hi.</li>}
      </ul>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        action={async (fd) => {
          await postEventMessage(fd);
          router.refresh();
          const res = await fetch(`/api/events/${eventId}/chat`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { messages: Msg[] };
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
