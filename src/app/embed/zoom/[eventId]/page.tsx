"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  joinZoomClientView,
  joinZoomComponentView,
  type ZoomJoinPayload,
} from "@/lib/zoom-embedded-cdn";

/** Isolated Zoom page — Client View full screen, or Component View inside iframe. */
export default function ZoomEmbedPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    let disposed = false;
    const inIframe = window.self !== window.top;
    const root = rootRef.current;

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
          await joinZoomComponentView(root, payload);
        } else {
          const leaveUrl = `${window.location.origin}/host/events`;
          await joinZoomClientView(payload, leaveUrl);
        }

        if (!disposed) setLoading(false);
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : "Zoom join failed");
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      disposed = true;
    };
  }, [eventId]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {loading && !error ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-zinc-500">
          Joining Zoom…
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-amber-200/90">
          {error}
        </p>
      ) : null}
      <div ref={rootRef} className="h-full w-full min-h-0 flex-1" />
    </div>
  );
}
