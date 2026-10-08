"use client";

import { useCallback, useState } from "react";
import { breakoutAssignmentPlayerInstructions } from "@/lib/breakout-assignment";

export function EventBreakoutAssignment({
  teamNames,
  compact = false,
}: {
  teamNames: string[];
  /** Tighter layout for the event info column. */
  compact?: boolean;
}) {
  const teams = teamNames.map((n) => n.trim()).filter(Boolean);
  const [copied, setCopied] = useState(false);

  const copyInstructions = useCallback(async () => {
    const text = breakoutAssignmentPlayerInstructions(teams);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [teams]);

  if (teams.length === 0) return null;

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-violet-500/25 bg-violet-950/20 p-3 text-xs text-zinc-300"
          : "rounded-xl border border-violet-500/25 bg-violet-950/20 p-4 text-sm text-zinc-300"
      }
    >
      <p className={`font-medium text-violet-200 ${compact ? "text-xs" : "text-sm"}`}>Join your team room</p>
      <p className={`mt-1 leading-relaxed text-zinc-500 ${compact ? "text-[11px]" : "text-xs"}`}>
        When the host opens breakouts, <strong className="text-zinc-400">you pick your room</strong> in Zoom — match the
        name to your team.
      </p>

      <ol
        className={`mt-2 list-decimal space-y-1.5 pl-4 leading-relaxed text-zinc-400 ${compact ? "text-[11px]" : "text-xs"}`}
      >
        <li>Join the Zoom panel {compact ? "→" : "(center)"}.</li>
        <li>
          Open <strong className="text-zinc-300">Breakout rooms</strong> in the Zoom toolbar (or under More).
        </li>
        <li>
          Tap <strong className="text-zinc-300">Choose breakout room</strong> / <strong className="text-zinc-300">Join</strong>{" "}
          next to your team.
        </li>
        <li>Confirm when Zoom asks to join the room.</li>
      </ol>

      <div className={`mt-2 flex flex-wrap gap-1.5 ${compact ? "" : "mt-3"}`}>
        {teams.map((name) => (
          <span
            key={name}
            className="rounded-md border border-violet-600/30 bg-violet-950/40 px-2 py-0.5 font-medium text-violet-100"
          >
            {name}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void copyInstructions()}
        className={`mt-2 rounded-lg border border-violet-600/50 px-2.5 py-1 text-violet-200 hover:bg-violet-950/50 ${compact ? "text-[11px]" : "text-xs"}`}
      >
        {copied ? "Copied" : "Copy steps for your team"}
      </button>
    </section>
  );
}
