"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleEventAttendance } from "@/actions/attendance";

export function EventJoinButton({
  eventId,
  eventSlug,
  initialJoined,
  attendanceCount,
}: {
  eventId: string;
  eventSlug: string;
  initialJoined: boolean;
  attendanceCount: number;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [count, setCount] = useState(attendanceCount);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div className="text-sm text-zinc-400">
        <strong className="text-white">{count}</strong> player{count === 1 ? "" : "s"} joined
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await toggleEventAttendance(eventId, eventSlug);
          setBusy(false);
          if (res.ok === false && res.error === "sign_in") {
            router.push(`/login?callbackUrl=${encodeURIComponent(`/events/${eventSlug}`)}`);
            return;
          }
          if (res.ok) {
            setJoined(res.joined);
            setCount((c) => (res.joined ? c + 1 : Math.max(0, c - 1)));
            router.refresh();
          }
        }}
        className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {joined ? "Leave" : "Join this event"}
      </button>
    </div>
  );
}
