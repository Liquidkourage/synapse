"use client";

import { useEffect, useRef } from "react";
import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";

const RESIZE_MESSAGE = "synapse-zoom-resize";

/** Zoom via isolated iframe (Component View) — stays on the event stage with chat and tools. */
export function ZoomMeetingEmbed({ eventId, fill = false }: { eventId: string; fill?: boolean }) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const postSize = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      const rect = iframe.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      win.postMessage(
        {
          type: RESIZE_MESSAGE,
          width: rect.width,
          height: rect.height,
        },
        window.location.origin,
      );
    };

    const ro = new ResizeObserver(postSize);
    ro.observe(iframe);
    postSize();

    return () => ro.disconnect();
  }, [src]);

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video min-h-[360px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      <iframe
        ref={iframeRef}
        title="Zoom meeting"
        src={src}
        className="min-h-[360px] min-w-0 flex-1 border-0"
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
