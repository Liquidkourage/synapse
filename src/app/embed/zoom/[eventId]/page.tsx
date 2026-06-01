"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  joinZoomClientView,
  joinZoomComponentView,
  updateZoomComponentVideoSize,
  type ZoomEmbeddedClient,
  type ZoomJoinPayload,
} from "@/lib/zoom-embedded-cdn";

async function waitForEmbedSize(root: HTMLElement) {
  for (let i = 0; i < 60; i++) {
    const { width, height } = root.getBoundingClientRect();
    if (width >= 320 && height >= 240) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

/** Isolated Zoom page — Component View in iframe on stage; Client View if opened directly. */
export default function ZoomEmbedPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const rootRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ZoomEmbeddedClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    let disposed = false;
    const inIframe = window.self !== window.top;
    const root = rootRef.current;
    let resizeObserver: ResizeObserver | null = null;

    async function run() {
      try {
        const res = await fetch(`/api/zoom/join?eventId=${encodeURIComponent(eventId)}`, {
          credentials: "include",
        });
        const data = (await res.json()) as ZoomJoinPayload & { error?: string };
        if (!res.ok || !data.signature) {
          throw new Error(data.error ?? "Could not join Zoom meeting");
        }
        if (disposed) return;

        const payload: ZoomJoinPayload = {
          sdkKey: data.sdkKey,
          signature: data.signature,
          meetingNumber: data.meetingNumber,
          password: data.password,
          userName: data.userName,
          userEmail: data.userEmail,
          zak: data.zak,
        };

        if (inIframe) {
          if (!root) return;
          await waitForEmbedSize(root);
          const client = await joinZoomComponentView(root, payload);
          if (disposed) return;
          clientRef.current = client;

          resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry || !clientRef.current) return;
            const { width, height } = entry.contentRect;
            if (width < 1 || height < 1) return;
            updateZoomComponentVideoSize(clientRef.current, width, height);
          });
          resizeObserver.observe(root);
        } else {
          const leaveUrl = `${window.location.origin}/host/events`;
          await joinZoomClientView(payload, leaveUrl);
        }

        if (!disposed) setError(null);
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : "Zoom join failed");
        }
      }
    }

    run();

    return () => {
      disposed = true;
      clientRef.current = null;
      resizeObserver?.disconnect();
    };
  }, [eventId]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {error ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-amber-200/90">
          {error}
        </p>
      ) : null}
      <div ref={rootRef} className="h-full w-full min-h-0 flex-1" />
    </div>
  );
}
