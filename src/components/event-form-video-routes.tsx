"use client";

import Link from "next/link";
import { useState } from "react";
import { SynapseVideoRoomButton } from "@/components/synapse-video-room-button";
import { ZoomCreateMeetingButton } from "@/components/zoom-create-meeting-button";
import type { LiveVideoRoute } from "@/lib/live-video-route";
import type { DailyVideoMode } from "@/lib/daily-video-mode";

type Defaults = {
  videoRoomMode: DailyVideoMode;
  broadcastEmbedUrl: string;
  breakoutTeamNames: string;
  broadcastHostOnlyJoin: string;
};

export function EventFormVideoRoutes({
  eventId,
  initialRoute,
  defaults,
  nativeVideoAvailable,
  autoRoomOnCreate,
  zoomOAuthConfigured,
  hostZoomConnected,
  showRoutePicker = true,
  initialCustom = false,
}: {
  eventId?: string;
  initialRoute: LiveVideoRoute;
  defaults: Defaults;
  nativeVideoAvailable: boolean;
  autoRoomOnCreate: boolean;
  zoomOAuthConfigured: boolean;
  hostZoomConnected: boolean;
  /** False when route is fixed by URL (e.g. /new/daily). */
  showRoutePicker?: boolean;
  initialCustom?: boolean;
}) {
  const [route, setRoute] = useState<LiveVideoRoute>(initialRoute);
  const [showCustom, setShowCustom] = useState(initialCustom);
  const d = defaults;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4">
      <input type="hidden" name="broadcastVideoProvider" value={showCustom ? "custom" : route} />

      <label className="block text-sm font-medium text-emerald-200">Live video route</label>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Pick one stack and stay in that UI for the whole show. You can change route before saving a new event; editing
        later may require re-syncing video.
      </p>

      {showRoutePicker ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <RouteCard
            active={route === "daily" && !showCustom}
            title="Daily (built-in)"
            subtitle="Host stage + Daily breakouts in-browser"
            tone="violet"
            onSelect={() => {
              setRoute("daily");
              setShowCustom(false);
            }}
          />
          <RouteCard
            active={route === "zoom" && !showCustom}
            title="Zoom (your account)"
            subtitle="Host stage + Zoom meeting & breakouts"
            tone="sky"
            onSelect={() => {
              setRoute("zoom");
              setShowCustom(false);
            }}
          />
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
          Route: <strong className="text-zinc-200">{route === "daily" ? "Daily (built-in)" : "Zoom"}</strong>
          {eventId ? (
            <>
              {" "}
              ·{" "}
              <Link href="/host/events/new" className="text-violet-400 hover:underline">
                New event chooser
              </Link>
            </>
          ) : null}
        </p>
      )}

      {showCustom ? (
        <CustomEmbedFields eventId={eventId} defaultUrl={d.broadcastEmbedUrl} onBack={() => setShowCustom(false)} />
      ) : route === "daily" ? (
        <DailyRouteFields
          eventId={eventId}
          defaults={d}
          nativeVideoAvailable={nativeVideoAvailable}
          autoRoomOnCreate={autoRoomOnCreate}
        />
      ) : (
        <ZoomRouteFields
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

function RouteCard({
  active,
  title,
  subtitle,
  tone,
  onSelect,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  tone: "violet" | "sky";
  onSelect: () => void;
}) {
  const border = tone === "violet" ? "border-violet-500/50" : "border-sky-500/50";
  const bg = tone === "violet" ? "bg-violet-950/40" : "bg-sky-950/40";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition ${
        active ? `${border} ${bg} ring-1 ring-white/10` : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600"
      }`}
    >
      <p className={`text-sm font-semibold ${tone === "violet" ? "text-violet-200" : "text-sky-200"}`}>{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
    </button>
  );
}

function MeetingStyleFields({
  route,
  videoRoomMode,
}: {
  route: LiveVideoRoute;
  videoRoomMode: DailyVideoMode;
}) {
  return (
    <fieldset className="mt-4 space-y-2 border-0 border-t border-zinc-800/80 p-0 pt-4">
      <legend className="text-sm font-medium text-zinc-300">Meeting style</legend>
      {route === "daily" ? (
        <p className="text-xs text-zinc-500">
          Streaming = watch-only players. Open = everyone on camera. Breakouts = Daily{" "}
          <strong className="text-zinc-400">Breakout</strong> in the lower panel.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Streaming = players mostly watch. Open = everyone in Zoom with camera/mic. Breakouts = Zoom team rooms in the
          lower panel; host mic on the top stage.
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
        <input
          type="radio"
          name="videoRoomMode"
          value="streaming"
          defaultChecked={videoRoomMode === "streaming"}
          className="mt-1"
        />
        <span>
          <span className="font-medium text-zinc-300">Streaming</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Host on camera; players watch (no join prompt).</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
        <input type="radio" name="videoRoomMode" value="open" defaultChecked={videoRoomMode === "open"} className="mt-1" />
        <span>
          <span className="font-medium text-zinc-300">Open room</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {route === "daily"
              ? "Everyone joins the Daily room with camera/mic."
              : "Everyone joins the Zoom call with camera/mic."}
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
        <input
          type="radio"
          name="videoRoomMode"
          value="breakouts"
          defaultChecked={videoRoomMode === "breakouts"}
          className="mt-1"
        />
        <span>
          <span className="font-medium text-zinc-300">Meeting with breakout rooms</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {route === "daily"
              ? "Dual panel: host stage on top, Daily breakouts below (Breakout button in Daily UI)."
              : "Dual panel: host stage on top, Zoom breakouts below (sidebar Create/Open/Close + Zoom toolbar)."}
          </span>
        </span>
      </label>
    </fieldset>
  );
}

function DailyRouteFields({
  eventId,
  defaults,
  nativeVideoAvailable,
  autoRoomOnCreate,
}: {
  eventId?: string;
  defaults: Defaults;
  nativeVideoAvailable: boolean;
  autoRoomOnCreate: boolean;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-zinc-800/80 pt-4">
      <p className="text-xs leading-relaxed text-violet-200/80">
        <strong className="text-violet-200">Daily route.</strong> Players use the same Daily-powered panels you do.
        Breakouts are managed with Daily&apos;s in-meeting <strong>Breakout</strong> control — not Zoom.
      </p>

      {!nativeVideoAvailable ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          Set <code className="text-[10px]">DAILY_API_KEY</code> on the server to create rooms.
        </p>
      ) : null}

      {nativeVideoAvailable && autoRoomOnCreate && !eventId ? (
        <p className="rounded-lg bg-zinc-900/50 px-2 py-1.5 text-xs text-emerald-200/85">
          Saving will create a Daily room unless you paste a URL below.
        </p>
      ) : null}

      <label htmlFor={eventId ? `broadcast-${eventId}` : "broadcast-new"} className="block text-xs text-zinc-500">
        Daily room URL (optional)
      </label>
      <input
        id={eventId ? `broadcast-${eventId}` : "broadcast-new"}
        name="broadcastEmbedUrl"
        placeholder={nativeVideoAvailable ? "Leave empty for auto-room" : "https://…"}
        defaultValue={defaults.broadcastEmbedUrl}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
      />
      {eventId && nativeVideoAvailable ? <SynapseVideoRoomButton eventId={eventId} /> : null}

      <MeetingStyleFields route="daily" videoRoomMode={defaults.videoRoomMode} />

      <HostOnlyCheckbox defaultChecked={defaults.broadcastHostOnlyJoin === "on"} routeLabel="Daily" />
    </div>
  );
}

function ZoomRouteFields({
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
      <p className="text-xs leading-relaxed text-sky-200/80">
        <strong className="text-sky-200">Zoom route.</strong> Teams meet in Zoom (lower panel). Your camera/mic for the
        audience is on the top host stage — keep Zoom muted if you like.{" "}
        <Link href="/host/settings/zoom" className="text-sky-400 hover:underline">
          Zoom settings
        </Link>
      </p>

      {zoomOAuthConfigured && !hostZoomConnected ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          <Link href="/host/settings/zoom" className="font-medium underline">
            Connect Zoom
          </Link>{" "}
          before saving.
        </p>
      ) : null}

      {hostZoomConnected ? (
        <p className="text-xs text-emerald-200/85">Zoom connected. Save syncs a meeting on your account.</p>
      ) : null}

      {eventId && hostZoomConnected ? <ZoomCreateMeetingButton eventId={eventId} /> : null}

      <MeetingStyleFields route="zoom" videoRoomMode={defaults.videoRoomMode} />

      <div>
        <label className="block text-sm text-zinc-400" htmlFor="breakoutTeamNames">
          Breakout team names (Zoom)
        </label>
        <p className="mt-1 text-xs text-zinc-600">
          One per line. Used by sidebar <strong className="text-zinc-500">Create rooms</strong> on the event page.
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

      <HostOnlyCheckbox defaultChecked={defaults.broadcastHostOnlyJoin === "on"} routeLabel="Zoom" />
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
      <p className="text-xs text-zinc-500">Custom player URL — no Daily or Zoom route.</p>
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
      <button type="button" onClick={onBack} className="text-xs text-violet-400 hover:underline">
        ← Back to Daily or Zoom route
      </button>
    </div>
  );
}

function HostOnlyCheckbox({ defaultChecked, routeLabel }: { defaultChecked: boolean; routeLabel: string }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
      <input
        type="checkbox"
        name="broadcastHostOnlyJoin"
        value="on"
        defaultChecked={defaultChecked}
        className="mt-1 rounded border-zinc-600"
      />
      <span>
        <span className="font-medium text-zinc-300">Hide video from non-hosts</span>
        <span className="mt-1 block text-xs text-zinc-500">
          Only host/staff see the {routeLabel} embed. Do not use with breakouts.
        </span>
      </span>
    </label>
  );
}
