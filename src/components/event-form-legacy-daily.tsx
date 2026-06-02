import Link from "next/link";
import { SynapseVideoRoomButton } from "@/components/synapse-video-room-button";
import type { DailyVideoMode } from "@/lib/daily-video-mode";

/** Read-only-ish legacy block for events created before Zoom-only video. */
export function EventFormLegacyDaily({
  eventId,
  defaults,
  nativeVideoAvailable,
}: {
  eventId: string;
  defaults: {
    videoRoomMode: DailyVideoMode;
    broadcastEmbedUrl: string;
    broadcastHostOnlyJoin: string;
  };
  nativeVideoAvailable: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4">
      <input type="hidden" name="broadcastVideoProvider" value="daily" />
      <p className="text-sm font-medium text-amber-200">Legacy Daily video</p>
      <p className="mt-1 text-xs text-zinc-500">
        This event still uses the old all-Daily layout. New events should use{" "}
        <Link href="/host/events/new" className="text-sky-400 hover:underline">
          Zoom video
        </Link>
        . To migrate, switch provider on save by editing meeting settings in a new event, or contact support.
      </p>
      <label htmlFor={`broadcast-legacy-${eventId}`} className="mt-3 block text-xs text-zinc-500">
        Daily room URL
      </label>
      <input
        id={`broadcast-legacy-${eventId}`}
        name="broadcastEmbedUrl"
        defaultValue={defaults.broadcastEmbedUrl}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
      />
      {nativeVideoAvailable ? <SynapseVideoRoomButton eventId={eventId} /> : null}
      <input type="hidden" name="videoRoomMode" value={defaults.videoRoomMode} />
      <input
        type="hidden"
        name="broadcastHostOnlyJoin"
        value={defaults.broadcastHostOnlyJoin === "on" ? "on" : ""}
      />
    </div>
  );
}
