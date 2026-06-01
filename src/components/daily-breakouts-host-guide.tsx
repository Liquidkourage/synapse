import Link from "next/link";

/** Shown to the event host when Daily breakout rooms are enabled. */
export function DailyBreakoutsHostGuide({ editEventId }: { editEventId?: string }) {
  return (
    <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-violet-200">Breakout rooms (host)</p>
      <p className="mt-1 text-xs text-zinc-500">
        Join the video while logged in as host. Only the host sees the <strong className="text-zinc-400">Breakout</strong>{" "}
        controls in Daily.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-400">
        <li>Open the video panel on this page (camera/mic prejoin is normal).</li>
        <li>In the Daily toolbar, tap <strong className="text-zinc-300">Breakout</strong>.</li>
        <li>Create team rooms, assign players (drag-and-drop or auto-assign), then start breakouts.</li>
        <li>Tap <strong className="text-zinc-300">Join</strong> on a room to visit it; end the session to bring everyone back to the main room.</li>
      </ol>
      <p className="mt-3 text-xs text-zinc-600">
        Players must join the video call (not watch-only streaming). Do not enable &quot;Hide video from non-hosts&quot; for
        breakouts.
      </p>
      {editEventId ? (
        <Link
          href={`/host/events/${editEventId}/edit`}
          className="mt-3 inline-block text-xs text-violet-400 hover:underline"
        >
          Event settings →
        </Link>
      ) : null}
    </div>
  );
}
