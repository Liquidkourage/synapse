"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZoomCreateMeetingButton({
  eventId,
  label = "Create / sync Zoom meeting",
}: {
  eventId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage(null);
          try {
            const res = await fetch(`/api/host/events/${eventId}/zoom-meeting`, { method: "POST" });
            const data = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok) {
              setMessage(data.error ?? "Failed");
            } else {
              setMessage("Zoom meeting ready.");
              router.refresh();
            }
          } catch {
            setMessage("Request failed");
          } finally {
            setPending(false);
          }
        }}
        className="rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
      >
        {pending ? "Working…" : label}
      </button>
      {message ? <p className="mt-1 text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
