"use client";

import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";

/** Zoom via isolated iframe (Component View) — stays on the event stage with chat and tools. */
export function ZoomMeetingEmbed({ eventId, fill = false }: { eventId: string; fill?: boolean }) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video min-h-[360px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      <iframe
        title="Zoom meeting"
        src={src}
        className="min-h-[360px] min-w-0 flex-1 border-0"
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
