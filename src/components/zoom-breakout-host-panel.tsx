"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SYNAPSE_ZOOM_BO_CHANNEL,
  isSynapseZoomBreakoutAck,
  isSynapseZoomBreakoutStatus,
  type SynapseZoomBreakoutCommand,
} from "@/lib/zoom-breakout-messages";

const BO_UI_TIMEOUT_MS = 25_000;

function zoomBreakoutIframeId(eventId: string): string {
  return `synapse-zoom-bo-${eventId}`;
}

function postToZoomEmbed(eventId: string, command: SynapseZoomBreakoutCommand): boolean {
  const iframe = document.getElementById(zoomBreakoutIframeId(eventId)) as HTMLIFrameElement | null;
  if (!iframe?.contentWindow) return false;
  iframe.contentWindow.postMessage(command, window.location.origin);
  return true;
}

/** Host checklist + programmatic breakout controls for Zoom events. */
export function ZoomBreakoutHostPanel({
  eventId,
  teamNames,
  editEventId,
}: {
  eventId: string;
  teamNames: string[];
  editEventId?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (isSynapseZoomBreakoutAck(event.data)) {
        setStatus("Contacting Zoom…");
        return;
      }
      if (!isSynapseZoomBreakoutStatus(event.data)) return;
      setBusy(null);
      setStatus(event.data.ok ? event.data.message : `Error: ${event.data.message}`);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => {
      setBusy(null);
      setStatus(
        "Error: Timed out waiting for Zoom. Make sure the meeting finished joining, then check the Zoom panel for a breakout dialog or use Breakout Rooms in the toolbar.",
      );
    }, BO_UI_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  const run = useCallback(
    (action: SynapseZoomBreakoutCommand["action"]) => {
      setStatus(null);
      setBusy(action);
      const cmd =
        action === "create-rooms"
          ? ({
              channel: SYNAPSE_ZOOM_BO_CHANNEL,
              action: "create-rooms",
              names: teamNames,
            } as const)
          : ({
              channel: SYNAPSE_ZOOM_BO_CHANNEL,
              action,
            } as const);
      if (!postToZoomEmbed(eventId, cmd)) {
        setBusy(null);
        setStatus("Join the Zoom meeting in the video panel first, then try again.");
      }
    },
    [eventId, teamNames],
  );

  const hasTeams = teamNames.length > 0;

  return (
    <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-sky-200">Zoom breakouts (host)</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        You stay in the <strong className="text-zinc-400">main</strong> Zoom session. Teams go to breakout rooms. To be
        heard in every room, unmute in Zoom and use <strong className="text-zinc-400">Broadcast voice</strong> (see
        below).
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-400">
        <li>Join the Zoom panel while logged in as host. Keep camera and mic on in Zoom.</li>
        <li>
          {hasTeams ? (
            <>
              Click <strong className="text-zinc-300">Create rooms</strong>, then{" "}
              <strong className="text-zinc-300">Open breakouts</strong>.
            </>
          ) : (
            <>
              Add team names on the{" "}
              {editEventId ? (
                <Link href={`/host/events/${editEventId}/edit`} className="text-sky-400 hover:underline">
                  event form
                </Link>
              ) : (
                "event form"
              )}{" "}
              first.
            </>
          )}
        </li>
        <li>
          After breakouts open, Synapse tries to <strong className="text-zinc-300">start broadcast voice</strong>{" "}
          automatically. Keep your mic unmuted in Zoom. If teams still can&apos;t hear you, use Breakout Rooms →
          Broadcast → Broadcast voice (or the Zoom desktop app).
        </li>
        <li>When done, click Close breakouts or use Zoom&apos;s Close all rooms.</li>
      </ol>

      {hasTeams ? (
        <p className="mt-2 text-[11px] text-zinc-600">Rooms: {teamNames.join(" · ")}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy || !hasTeams}
          onClick={() => run("create-rooms")}
          className="rounded-lg bg-sky-700/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {busy === "create-rooms" ? "Creating…" : "Create rooms"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("open-rooms")}
          className="rounded-lg border border-sky-600/60 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-950/40 disabled:opacity-50"
        >
          {busy === "open-rooms" ? "Opening…" : "Open breakouts"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("close-rooms")}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800/50 disabled:opacity-50"
        >
          {busy === "close-rooms" ? "Closing…" : "Close breakouts"}
        </button>
      </div>

      {status ? (
        <p
          className={`mt-2 text-xs ${status.startsWith("Error:") ? "text-amber-300/90" : "text-zinc-400"}`}
        >
          {status}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] text-zinc-600">
        Synapse enables <strong className="text-zinc-500">Breakout room</strong> on your Zoom account when you connect.
        If <strong className="text-zinc-500">Broadcast voice to breakout rooms</strong> is locked off at zoom.us → Settings
        → Meeting, turn it on once there — Zoom does not expose that checkbox via API.
      </p>

      {editEventId ? (
        <Link
          href={`/host/events/${editEventId}/edit`}
          className="mt-3 inline-block text-xs text-sky-400 hover:underline"
        >
          Event settings →
        </Link>
      ) : null}
    </div>
  );
}
