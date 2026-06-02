import { BroadcastEmbed } from "@/components/broadcast-embed";
import { ZoomMeetingEmbed } from "@/components/zoom-meeting-embed";

/** Zoom breakouts: host camera on Daily stage (everyone watches) + Zoom for team rooms. */
export function ZoomBreakoutDualVideo({
  stageSrc,
  zoomEventId,
  isHost = false,
}: {
  stageSrc: string;
  zoomEventId: string;
  isHost?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-[2] flex-col gap-1">
        <p className="shrink-0 px-1 text-[11px] font-medium text-violet-300/90 sm:text-xs">
          Host {isHost ? "(keep camera & mic on here)" : ""}
        </p>
        <BroadcastEmbed src={stageSrc} title="Host stage" fill showOpenInNewTab />
      </div>
      <div className="flex min-h-0 flex-[3] flex-col gap-1">
        <p className="shrink-0 px-1 text-[11px] font-medium text-zinc-500 sm:text-xs">
          {isHost
            ? "Zoom — breakouts & teams (sidebar controls)"
            : "Your team — join the Zoom room the host sends you to"}
        </p>
        <ZoomMeetingEmbed
          eventId={zoomEventId}
          fill
          iframeId={isHost ? `synapse-zoom-bo-${zoomEventId}` : undefined}
        />
      </div>
    </div>
  );
}
