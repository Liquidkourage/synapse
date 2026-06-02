"use client";

import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";

/** Zoom Client View in an isolated iframe — gallery shows host + all guests. */
export function ZoomMeetingEmbed({
  eventId,
  fill = false,
  iframeId,
}: {
  eventId: string;
  fill?: boolean;
  /** Stable id for host breakout postMessage (`synapse-zoom-bo-{eventId}`). */
  iframeId?: string;
}) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[480px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video min-h-[480px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      <iframe
        id={iframeId}
        title="Zoom meeting"
        src={src}
        className="h-full min-h-[480px] w-full min-w-0 flex-1 border-0"
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
