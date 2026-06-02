"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventAnnouncementClient } from "@/lib/event-announcement-dto";

export function EventAnnouncementBanner({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EventAnnouncementClient | null;
}) {
  const [announcement, setAnnouncement] = useState<EventAnnouncementClient | null>(initial);

  const streamUrl = useMemo(() => {
    const afterAnnouncement = initial?.createdAt ?? new Date(0).toISOString();
    return `/api/events/${eventId}/stream?afterAnnouncement=${encodeURIComponent(afterAnnouncement)}`;
  }, [eventId, initial?.createdAt]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(streamUrl);
      es.addEventListener("announcement", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as { announcement?: EventAnnouncementClient };
          const a = parsed.announcement;
          if (!a) return;
          if (a.pinned && a.body.trim()) setAnnouncement(a);
          else setAnnouncement(null);
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    return () => {
      try {
        es?.close();
      } catch {
        /* ignore */
      }
    };
  }, [streamUrl]);

  if (!announcement?.pinned || !announcement.body.trim()) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/30 px-3 py-2 text-sm text-violet-100">
      <span className="mr-2 inline-block rounded bg-violet-600/30 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-100">
        Announcement
      </span>
      <span className="text-violet-50">{announcement.body}</span>
    </div>
  );
}

