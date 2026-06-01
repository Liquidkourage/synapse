import Link from "next/link";

/** Host tips for Zoom breakout events (voice broadcast to all teams). */
export function ZoomBreakoutsHostGuide({ editEventId }: { editEventId?: string }) {
  return (
    <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-sky-200">Zoom breakouts (host)</p>
      <p className="mt-1 text-xs text-zinc-500">
        In the Zoom toolbar, open <strong className="text-zinc-400">Breakout Rooms</strong> to assign teams. Use{" "}
        <strong className="text-zinc-400">Broadcast</strong> → <strong className="text-zinc-400">Broadcast voice</strong>{" "}
        so everyone in team rooms hears you without leaving the main session.
      </p>
      <p className="mt-2 text-xs text-zinc-600">
        Enable &quot;Broadcast voice to breakout rooms&quot; in your Zoom web portal → Settings → Meeting → Breakout
        room.
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
