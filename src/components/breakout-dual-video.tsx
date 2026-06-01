import { BroadcastEmbed } from "@/components/broadcast-embed";

/** Host stage (always on) + meeting room (team breakouts) for breakout events. */
export function BreakoutDualVideo({
  stageSrc,
  meetingSrc,
  isHost,
}: {
  stageSrc: string | null;
  meetingSrc: string | null;
  isHost?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2">
      {stageSrc ? (
        <div className="flex min-h-0 flex-[2] flex-col gap-1">
          <p className="shrink-0 px-1 text-[11px] font-medium text-violet-300/90 sm:text-xs">
            Host {isHost ? "(keep camera & mic on here)" : ""}
          </p>
          <BroadcastEmbed src={stageSrc} title="Host stage" fill showOpenInNewTab />
        </div>
      ) : null}
      {meetingSrc ? (
        <div className="flex min-h-0 flex-[3] flex-col gap-1">
          <p className="shrink-0 px-1 text-[11px] font-medium text-zinc-500 sm:text-xs">
            {isHost ? "Breakouts — assign teams here" : "Your team — host sends you to a room"}
          </p>
          <BroadcastEmbed src={meetingSrc} title="Team meeting" fill showOpenInNewTab />
        </div>
      ) : null}
    </div>
  );
}
