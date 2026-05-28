"use client";

import { useState } from "react";
import type { EventKind } from "@/generated/prisma";
import { EVENT_KIND_OPTIONS } from "@/lib/event-kind";

export function EventFormKindLayout({
  defaultKind,
  shared,
  live,
  podcast,
}: {
  defaultKind: EventKind;
  shared: React.ReactNode;
  live: React.ReactNode;
  podcast: React.ReactNode;
}) {
  const [kind, setKind] = useState<EventKind>(defaultKind);
  const isPodcast = kind === "PODCAST";

  return (
    <>
      <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4">
        <label htmlFor="event-kind" className="block text-sm font-medium text-zinc-200">
          Type of event
        </label>
        <p className="mt-1 text-xs text-zinc-500">Controls which fields you need and where the event appears on Synapse.</p>
        <input type="hidden" name="eventKind" value={kind} />
        <select
          id="event-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as EventKind)}
          className="mt-3 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
        >
          {EVENT_KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {EVENT_KIND_OPTIONS.find((o) => o.value === kind)?.description}
        </p>
      </div>

      {shared}

      <div className={isPodcast ? "hidden" : "space-y-4"} aria-hidden={isPodcast}>
        {live}
      </div>

      <div className={isPodcast ? "space-y-4" : "hidden"} aria-hidden={!isPodcast}>
        {podcast}
      </div>
    </>
  );
}
