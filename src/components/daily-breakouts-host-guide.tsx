import Link from "next/link";

/** Shown to the event host when Daily breakout rooms are enabled. */
export function DailyBreakoutsHostGuide({ editEventId }: { editEventId?: string }) {
  return (
    <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-violet-200">Breakout rooms (host)</p>
      <p className="mt-1 text-xs text-zinc-500">
        You get two video panels. Players always see and hear you on the top <strong className="text-zinc-400">Host</strong>{" "}
        panel — keep your camera and mic on there.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-400">
        <li>
          Join both panels while logged in as host (prejoin is normal). Top = your stage; bottom = breakout controls.
        </li>
        <li>
          In the <strong className="text-zinc-300">lower</strong> panel, tap <strong className="text-zinc-300">Breakout</strong>{" "}
          to create team rooms, assign players, and start breakouts.
        </li>
        <li>
          You can mute camera in the lower panel if you only want to be seen on stage; unmute when you join a team room.
        </li>
        <li>
          End the breakout session to bring everyone back to the main meeting room.
        </li>
      </ol>
      <p className="mt-3 text-xs text-zinc-600">
        Players must join both panels (or allow both iframes). Do not enable &quot;Hide video from non-hosts&quot; for
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
