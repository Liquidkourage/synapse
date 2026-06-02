"use client";

import Link from "next/link";
import { useState } from "react";
import { ZoomCreateMeetingButton } from "@/components/zoom-create-meeting-button";
import type { DailyVideoMode } from "@/lib/daily-video-mode";

type Defaults = {
  videoRoomMode: DailyVideoMode;
  breakoutTeamNames: string;
  broadcastHostOnlyJoin: string;
  broadcastEmbedUrl: string;
};

/** Live video: Zoom meeting (single embed). Optional custom embed URL. */
export function EventFormZoomVideo({
  eventId,
  defaults,
  zoomOAuthConfigured,
  hostZoomConnected,
  initialCustom = false,
}: {
  eventId?: string;
  defaults: Defaults;
  zoomOAuthConfigured: boolean;
  hostZoomConnected: boolean;
  initialCustom?: boolean;
}) {
  const [showCustom, setShowCustom] = useState(initialCustom);
  const d = defaults;

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-950/15 p-4">
      <input type="hidden" name="broadcastVideoProvider" value={showCustom ? "custom" : "zoom"} />

      <label className="block text-sm font-medium text-sky-200">Live video (Zoom)</label>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        One Zoom embed for everyone. For breakouts you stay in the <strong className="text-zinc-400">main</strong>{" "}
        meeting with mic on; teams hear you via Zoom&apos;s{" "}
        <strong className="text-zinc-400">Broadcast voice to breakout rooms</strong> (enable in Zoom account settings).
      </p>

      {showCustom ? (
        <CustomEmbedFields
          eventId={eventId}
          defaultUrl={d.broadcastEmbedUrl}
          onBack={() => setShowCustom(false)}
        />
      ) : (
        <ZoomFields
          eventId={eventId}
          defaults={d}
          zoomOAuthConfigured={zoomOAuthConfigured}
          hostZoomConnected={hostZoomConnected}
        />
      )}

      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Use custom embed URL instead (Mux, etc.)
        </button>
      ) : null}
    </div>
  );
}

function ZoomFields({
  eventId,
  defaults,
  zoomOAuthConfigured,
  hostZoomConnected,
}: {
  eventId?: string;
  defaults: Defaults;
  zoomOAuthConfigured: boolean;
  hostZoomConnected: boolean;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-zinc-800/80 pt-4">
      {zoomOAuthConfigured && !hostZoomConnected ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          <Link href="/host/settings/zoom" className="font-medium underline">
            Connect Zoom
          </Link>{" "}
          before saving.
        </p>
      ) : null}

      {hostZoomConnected ? (
        <p className="text-xs text-emerald-200/85">Zoom connected. Save creates or updates a meeting on your account.</p>
      ) : null}

      {eventId && hostZoomConnected ? <ZoomCreateMeetingButton eventId={eventId} /> : null}

      <fieldset className="space-y-2 border-0 p-0">
        <legend className="text-sm font-medium text-zinc-300">Meeting style</legend>
        <p className="text-xs text-zinc-500">
          Breakouts = host stays in main Zoom; teams in rooms — use Broadcast voice so they hear you. Sidebar controls on
          the event page.
        </p>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="radio"
            name="videoRoomMode"
            value="streaming"
            defaultChecked={defaults.videoRoomMode === "streaming"}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-zinc-300">Streaming</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Host on camera; players mostly watch in Zoom.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="radio"
            name="videoRoomMode"
            value="open"
            defaultChecked={defaults.videoRoomMode === "open"}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-zinc-300">Open room</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Everyone joins Zoom with camera/mic.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="radio"
            name="videoRoomMode"
            value="breakouts"
            defaultChecked={defaults.videoRoomMode === "breakouts"}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-zinc-300">Meeting with breakout rooms</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Recommended for trivia — Zoom breakouts; host in main session.</span>
          </span>
        </label>
      </fieldset>

      <div>
        <label className="block text-sm text-zinc-400" htmlFor="breakoutTeamNames">
          Breakout team names
        </label>
        <p className="mt-1 text-xs text-zinc-600">
          One per line. Used by <strong className="text-zinc-500">Create rooms</strong> on the event page (breakout style
          only).
        </p>
        <textarea
          id="breakoutTeamNames"
          name="breakoutTeamNames"
          rows={5}
          defaultValue={defaults.breakoutTeamNames}
          placeholder={"Team A\nTeam B\nTeam C"}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
        <input
          type="checkbox"
          name="broadcastHostOnlyJoin"
          value="on"
          defaultChecked={defaults.broadcastHostOnlyJoin === "on"}
          className="mt-1 rounded border-zinc-600"
        />
        <span>
          <span className="font-medium text-zinc-300">Hide video from non-hosts</span>
          <span className="mt-1 block text-xs text-zinc-500">Do not use with breakouts.</span>
        </span>
      </label>
    </div>
  );
}

function CustomEmbedFields({
  eventId,
  defaultUrl,
  onBack,
}: {
  eventId?: string;
  defaultUrl: string;
  onBack: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-zinc-800/80 pt-4">
      <p className="text-xs text-zinc-500">Custom player — not Zoom.</p>
      <label htmlFor={eventId ? `broadcast-custom-${eventId}` : "broadcast-custom-new"} className="block text-xs text-zinc-500">
        Video embed URL
      </label>
      <input
        id={eventId ? `broadcast-custom-${eventId}` : "broadcast-custom-new"}
        name="broadcastEmbedUrl"
        placeholder="https://…"
        defaultValue={defaultUrl}
        required
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
      />
      <button type="button" onClick={onBack} className="text-xs text-sky-400 hover:underline">
        ← Back to Zoom video
      </button>
    </div>
  );
}
