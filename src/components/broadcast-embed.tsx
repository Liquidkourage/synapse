/** Permissions for B2B video SDK iframes (Daily, Mux Live, 100ms, etc.). */
const BROADCAST_IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write";

export function BroadcastEmbed({
  src,
  title = "Live broadcast",
  /** Fill resizable panel height instead of fixed 16:9 */
  fill = false,
}: {
  src: string;
  title?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[160px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      <iframe
        title={title}
        src={src}
        className={fill ? "min-h-0 min-w-0 flex-1 border-0" : "h-full w-full border-0"}
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
