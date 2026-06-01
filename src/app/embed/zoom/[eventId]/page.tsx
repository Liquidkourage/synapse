"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { joinZoomClientView, type ZoomJoinPayload } from "@/lib/zoom-embedded-cdn";

/** Isolated Zoom iframe page — Client View gallery so every participant is visible. */
export default function ZoomEmbedPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    let disposed = false;

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
          eventSlug: data.eventSlug,
          zak: data.zak,
        };

        const leaveUrl = data.eventSlug
          ? `${window.location.origin}/events/${encodeURIComponent(data.eventSlug)}`
          : `${window.location.origin}/host/events`;

        await joinZoomClientView(payload, leaveUrl);

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
    };
  }, [eventId]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {error ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-amber-200/90">
          {error}
        </p>
      ) : null}
    </div>
  );
}
