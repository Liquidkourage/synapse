"use client";

import { useEffect, useRef, useState } from "react";
import { BROADCAST_IFRAME_ALLOW } from "@/components/broadcast-embed";
import {
  supportsZoomGalleryView,
  ZOOM_GALLERY_MIN_HEIGHT,
  ZOOM_GALLERY_MIN_WIDTH,
} from "@/lib/zoom-embedded-cdn";

/** Zoom via isolated iframe (Component View) — stays on the event stage with chat and tools. */
export function ZoomMeetingEmbed({ eventId, fill = false }: { eventId: string; fill?: boolean }) {
  const src = `/embed/zoom/${encodeURIComponent(eventId)}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [galleryReady, setGalleryReady] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const check = () => {
      const { width, height } = el.getBoundingClientRect();
      setGalleryReady(supportsZoomGalleryView(width, height));
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={
        fill
          ? "flex h-full min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video min-h-[360px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      {!galleryReady ? (
        <p className="shrink-0 border-b border-amber-500/20 bg-amber-950/30 px-2 py-1.5 text-center text-[11px] text-amber-200/90 sm:text-xs">
          Drag the panel corner to enlarge — gallery view needs about {ZOOM_GALLERY_MIN_WIDTH}×
          {ZOOM_GALLERY_MIN_HEIGHT}px to show every camera.
        </p>
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
