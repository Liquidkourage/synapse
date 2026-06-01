"use client";

import { useEffect, useRef, useState } from "react";

type JoinPayload = {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  role: number;
  zak?: string | null;
  breakoutsEnabled?: boolean;
  error?: string;
};

/** Embedded Zoom Meeting SDK (Component View) for host-connected meetings. */
export function ZoomMeetingEmbed({ eventId, fill = false }: { eventId: string; fill?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    const root = rootRef.current;

    async function join() {
      try {
        const res = await fetch(`/api/zoom/join?eventId=${encodeURIComponent(eventId)}`);
        const data = (await res.json()) as JoinPayload;
        if (!res.ok || !data.signature) {
          throw new Error(data.error ?? "Could not join Zoom meeting");
        }
        if (disposed || !root) return;

        const { default: ZoomMtgEmbedded } = await import("@zoom/meetingsdk/embedded");
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

    join();

    return () => {
      disposed = true;
    };
  }, [eventId]);

  return (
    <div
      className={
        fill
          ? "relative flex h-full min-h-[200px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
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
      <div ref={rootRef} className="h-full w-full min-h-[200px]" />
    </div>
  );
}
