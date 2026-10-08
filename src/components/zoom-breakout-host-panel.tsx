"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { postEventAnnouncement } from "@/actions/announcements";
import {
  breakoutAssignmentAnnouncementBody,
  breakoutAssignmentHostOpenChecklist,
} from "@/lib/breakout-assignment";
import {
  SYNAPSE_ZOOM_BO_CHANNEL,
  isSynapseZoomBreakoutAck,
  isSynapseZoomBreakoutStatus,
  type SynapseZoomBreakoutCommand,
} from "@/lib/zoom-breakout-messages";

const AUTO_PIN_KEY = "synapse-zoom-bo-auto-pin-assignment";

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
  const teams = teamNames.map((n) => n.trim()).filter(Boolean);
  const hasTeams = teams.length > 0;

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoPinAssignment, setAutoPinAssignment] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const lastAutoPinAt = useRef(0);

  useEffect(() => {
    try {
      setAutoPinAssignment(localStorage.getItem(AUTO_PIN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const pinAssignmentForViewers = useCallback(async () => {
    if (teams.length === 0) return;
    setPinBusy(true);
    try {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("body", breakoutAssignmentAnnouncementBody(teams));
      fd.set("pinned", "true");
      await postEventAnnouncement(fd);
      setStatus("Pinned team list for all viewers on Synapse.");
    } catch {
      setStatus("Error: Could not pin announcement.");
    } finally {
      setPinBusy(false);
    }
  }, [eventId, teams]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (isSynapseZoomBreakoutAck(event.data)) {
        setStatus("Contacting Zoom…");
        return;
      }
      if (!isSynapseZoomBreakoutStatus(event.data)) return;
      setBusy(null);
      const msg = event.data.ok ? event.data.message : `Error: ${event.data.message}`;
      setStatus(msg);
      if (
        event.data.ok &&
        autoPinAssignment &&
        teamNames.length > 0 &&
        /breakout rooms are open/i.test(event.data.message) &&
        Date.now() - lastAutoPinAt.current > 5000
      ) {
        lastAutoPinAt.current = Date.now();
        void pinAssignmentForViewers();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoPinAssignment, pinAssignmentForViewers, teamNames.length]);

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

  const hostAssignmentSteps = breakoutAssignmentHostOpenChecklist();

  return (
    <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-sky-200">Zoom breakouts (host)</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        You stay in the <strong className="text-zinc-400">main</strong> Zoom session. Teams go to breakout rooms. To be
        heard in every room, unmute in Zoom and use <strong className="text-zinc-400">Broadcast voice</strong> (see
        below).
      </p>

      <div className="mt-3 rounded-lg border border-sky-800/40 bg-sky-950/30 p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-sky-300/90">Assignment (recommended)</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          <strong className="text-zinc-400">Self-select</strong> — players pick a room in Zoom that matches their team
          name. Synapse opens breakouts with choose-your-room when the SDK allows it; if not, enable{" "}
          <strong className="text-zinc-400">Let participants choose room</strong> in the Zoom breakout dialog.
        </p>
      </div>

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
        {hasTeams
          ? hostAssignmentSteps.slice(1).map((step) => (
              <li key={step}>{step}</li>
            ))
          : null}
        <li>When done, click Close breakouts or use Zoom&apos;s Close all rooms.</li>
      </ol>

      {hasTeams ? (
        <p className="mt-2 text-[11px] text-zinc-600">Rooms: {teams.join(" · ")}</p>
      ) : null}

      {hasTeams ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-sky-800/30 pt-3">
          <button
            type="button"
            disabled={pinBusy || !!busy}
            onClick={() => void pinAssignmentForViewers()}
            className="rounded-lg bg-violet-700/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {pinBusy ? "Pinning…" : "Pin team list for viewers"}
          </button>
          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-zinc-500">
            <input
              type="checkbox"
              checked={autoPinAssignment}
              onChange={(e) => {
                const on = e.target.checked;
                setAutoPinAssignment(on);
                try {
                  localStorage.setItem(AUTO_PIN_KEY, on ? "1" : "0");
                } catch {
                  /* ignore */
                }
              }}
              className="mt-0.5 rounded border-zinc-600"
            />
            <span>Auto-pin team list when breakouts open successfully</span>
          </label>
        </div>
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
