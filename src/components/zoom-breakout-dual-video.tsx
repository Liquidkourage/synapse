import { BroadcastEmbed } from "@/components/broadcast-embed";
import { ZoomMeetingEmbed } from "@/components/zoom-meeting-embed";

/** Zoom breakouts: host camera on Daily stage + Zoom meeting for team rooms. */
export function ZoomBreakoutDualVideo({
  stageSrc,
  zoomEventId,
}: {
  stageSrc: string;
  zoomEventId: string;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-[2] flex-col gap-1">
        <p className="shrink-0 px-1 text-[11px] font-medium text-violet-300/90 sm:text-xs">
          Host (keep camera &amp; mic on here)
        </p>
        <BroadcastEmbed src={stageSrc} title="Host stage" fill showOpenInNewTab />
      </div>
      <div className="flex min-h-0 flex-[3] flex-col gap-1">
        <p className="shrink-0 px-1 text-[11px] font-medium text-zinc-500 sm:text-xs">
          Zoom — breakouts &amp; teams (use controls in the sidebar)
        </p>
        <ZoomMeetingEmbed eventId={zoomEventId} fill iframeId={`synapse-zoom-bo-${zoomEventId}`} />
      </div>
    </div>
  );
}
