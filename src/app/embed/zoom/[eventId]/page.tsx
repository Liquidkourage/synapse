"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadZoomEmbeddedSdk } from "@/lib/zoom-embedded-cdn";

type JoinPayload = {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  role: number;
  zak?: string | null;
  error?: string;
};

/** Isolated Zoom embed page (CDN SDK + React 18) — loaded in iframe from event stage. */
export default function ZoomEmbedPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    let disposed = false;
    const root = rootRef.current;

    async function run() {
      try {
        const res = await fetch(`/api/zoom/join?eventId=${encodeURIComponent(eventId)}`, {
          credentials: "include",
        });
        const data = (await res.json()) as JoinPayload;
        if (!res.ok || !data.signature) {
          throw new Error(data.error ?? "Could not join Zoom meeting");
        }
        if (disposed || !root) return;

        const ZoomMtgEmbedded = await loadZoomEmbeddedSdk();
        const client = ZoomMtgEmbedded.createClient();

        await client.init({
          zoomAppRoot: root,
          language: "en-US",
          patchJsMedia: true,
        });

        await client.join({
          signature: data.signature,
          sdkKey: data.sdkKey,
          meetingNumber: data.meetingNumber,
          password: data.password,
          userName: data.userName,
          userEmail: data.userEmail,
          tk: "",
          zak: data.zak ?? "",
        });

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
