"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Only mount when `DAILY_API_KEY` is set — parent handles help text when it is not. */
export function SynapseVideoRoomButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/host/events/${eventId}/synapse-video`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not create room");
        return;
      }
      setMessage("Room URL saved to this event.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 space-y-1 border-t border-emerald-500/20 pt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-3 py-1.5 text-sm text-emerald-100 hover:bg-emerald-950/70 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create new Synapse video room"}
      </button>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
      <p className="text-xs text-zinc-600">
        Creates a fresh Daily.co room and overwrites the URL field above. Use if you need a new room.
      </p>
    </div>
  );
}
