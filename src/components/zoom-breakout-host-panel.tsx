"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SYNAPSE_ZOOM_BO_CHANNEL,
  isSynapseZoomBreakoutStatus,
  type SynapseZoomBreakoutCommand,
} from "@/lib/zoom-breakout-messages";

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
  stageAvailable,
}: {
  eventId: string;
  teamNames: string[];
  editEventId?: string;
  /** Daily host stage was provisioned (dual video). */
  stageAvailable: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isSynapseZoomBreakoutStatus(event.data)) return;
      setBusy(null);
      setStatus(event.data.ok ? event.data.message : `Error: ${event.data.message}`);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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

      {!stageAvailable ? (
        <p className="mt-2 text-xs text-amber-300/90">
          Host stage room is not set up yet. Save the event with breakouts enabled and use{" "}
          <strong className="text-amber-200/90">Create / sync Zoom meeting</strong> (requires{" "}
          <code className="text-[10px]">DAILY_API_KEY</code> on the server for your camera panel).
        </p>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">
          Top panel = your camera (Daily). Bottom = Zoom — teams join breakouts there. Use{" "}
          <strong className="text-zinc-400">Broadcast → Broadcast voice</strong> in Zoom so all rooms hear you.
        </p>
      )}

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-400">
        <li>Join both video panels while logged in as host.</li>
        <li>
          {hasTeams ? (
            <>
              Click <strong className="text-zinc-300">Create rooms</strong> below to add{" "}
              {teamNames.length} preset team room{teamNames.length === 1 ? "" : "s"}.
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
              (one per line), save, then create rooms.
            </>
          )}
        </li>
        <li>Assign players to rooms in Zoom if needed, then click Open breakouts.</li>
        <li>When done, Close breakouts to bring everyone back to the main session.</li>
      </ol>

      {hasTeams ? (
        <p className="mt-2 text-[11px] text-zinc-600">
          Rooms: {teamNames.join(" · ")}
        </p>
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
        If Create rooms fails: confirm the event uses <strong className="text-zinc-500">Meeting with breakout rooms</strong>
        , click <strong className="text-zinc-500">Create / sync Zoom meeting</strong>, then leave and rejoin the video
        panel. For voice in all rooms (after breakouts are open): Zoom portal → Settings → Meeting → Breakout room →
        Broadcast voice to breakout rooms.
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
