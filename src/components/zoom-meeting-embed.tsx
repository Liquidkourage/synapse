"use client";

import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";

/** Zoom via isolated iframe page (CDN SDK avoids React 19 conflict with @zoom/meetingsdk). */
export function ZoomMeetingEmbed({ eventId, fill = false }: { eventId: string; fill?: boolean }) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[200px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      <iframe
        title="Zoom meeting"
        src={src}
        className="min-h-0 min-w-0 flex-1 border-0"
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
