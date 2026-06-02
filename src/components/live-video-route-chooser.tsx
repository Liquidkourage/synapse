import Link from "next/link";

/** Pick Daily-native vs Zoom-native before creating an event. */
export function LiveVideoRouteChooser({
  nativeVideoAvailable,
  zoomOAuthConfigured,
  hostZoomConnected,
}: {
  nativeVideoAvailable: boolean;
  zoomOAuthConfigured: boolean;
  hostZoomConnected: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
        Choose one video stack for this event. Each path keeps the host in a familiar interface — Daily Prebuilt or
        Zoom — with Synapse wiring the event page for you.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/host/events/new/daily"
          className="group rounded-2xl border border-violet-500/40 bg-violet-950/20 p-5 transition hover:border-violet-400/60 hover:bg-violet-950/35"
        >
          <p className="text-lg font-semibold text-violet-200 group-hover:text-violet-100">Daily (built-in)</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Two Synapse panels: host stage on top, Daily meeting +{" "}
            <strong className="text-zinc-400">Breakout</strong> button below. Everything stays in the Daily UI you join
            in the browser.
          </p>
          {!nativeVideoAvailable ? (
            <p className="mt-3 text-xs text-amber-300/90">Requires DAILY_API_KEY on the server.</p>
          ) : (
            <p className="mt-3 text-xs text-emerald-200/80">Ready — rooms auto-create on save.</p>
          )}
          <span className="mt-4 inline-block text-sm font-medium text-violet-400 group-hover:underline">
            Create with Daily →
          </span>
        </Link>

        <Link
          href="/host/events/new/zoom"
          className="group rounded-2xl border border-sky-500/40 bg-sky-950/20 p-5 transition hover:border-sky-400/60 hover:bg-sky-950/35"
        >
          <p className="text-lg font-semibold text-sky-200 group-hover:text-sky-100">Zoom (your account)</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Host stage on top (Synapse + Daily), Zoom meeting below for teams and breakout rooms. Sidebar controls +
            familiar Zoom toolbar — no need to learn Daily breakouts.
          </p>
          {!zoomOAuthConfigured ? (
            <p className="mt-3 text-xs text-amber-300/90">Admin must configure Zoom OAuth on the server.</p>
          ) : !hostZoomConnected ? (
            <p className="mt-3 text-xs text-amber-300/90">
              <Link href="/host/settings/zoom" className="underline hover:text-amber-100">
                Connect Zoom
              </Link>{" "}
              before the show.
            </p>
          ) : (
            <p className="mt-3 text-xs text-emerald-200/80">Zoom connected.</p>
          )}
          <span className="mt-4 inline-block text-sm font-medium text-sky-400 group-hover:underline">
            Create with Zoom →
          </span>
        </Link>
      </div>

      <p className="text-xs text-zinc-600">
        Already started?{" "}
        <Link href="/host/events/new/custom" className="text-zinc-400 hover:underline">
          Custom embed URL
        </Link>{" "}
        (Mux, etc.) ·{" "}
        <Link href="/host/settings/zoom" className="text-zinc-400 hover:underline">
          Zoom settings
        </Link>
      </p>
    </div>
  );
}
