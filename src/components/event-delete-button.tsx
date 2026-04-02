"use client";

import { deleteEvent } from "@/actions/events";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function EventDeleteButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/50 disabled:opacity-50"
      onClick={() => {
        if (!confirm("Delete this event permanently? Chat and attendance for this event will be removed. This cannot be undone.")) {
          return;
        }
        startTransition(async () => {
          const r = await deleteEvent(eventId);
          if (r.ok) {
            router.push("/host/events");
            router.refresh();
          } else {
            alert(r.error);
          }
        });
      }}
    >
      {pending ? "Deleting…" : "Delete event"}
    </button>
  );
}
