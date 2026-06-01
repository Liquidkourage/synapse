"use client";

import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";

/** Zoom via isolated iframe (Component View). Hosts should use full-screen link for gallery view. */
export function ZoomMeetingEmbed({
  eventId,
  fill = false,
  showHostOpenTab = false,
}: {
  eventId: string;
  fill?: boolean;
  showHostOpenTab?: boolean;
}) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video min-h-[360px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      {showHostOpenTab ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 px-2 py-1.5 text-center text-[11px] font-medium text-sky-400 hover:bg-zinc-900/90 hover:underline sm:text-xs"
        >
          Open full-screen Zoom (recommended for host — see all cameras)
        </a>
      ) : null}
      <iframe
        title="Zoom meeting"
        src={src}
        className="min-h-[360px] min-w-0 flex-1 border-0"
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
