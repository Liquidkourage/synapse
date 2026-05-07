/** Permissions for B2B video SDK iframes (Daily, Mux Live, 100ms, etc.). */
export const BROADCAST_IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; encrypted-media; picture-in-picture";

export function BroadcastEmbed({
  src,
  title = "Live broadcast",
  /** Fill resizable panel height instead of fixed 16:9 */
  fill = false,
  /** Opens the same URL in a new browser tab — useful on mobile when Synapse audio drops after switching tabs. (True PiP is not available for cross-origin embeds.) */
  showOpenInNewTab = false,
}: {
  src: string;
  title?: string;
  fill?: boolean;
  showOpenInNewTab?: boolean;
}) {
  return (
    <div
      className={
        fill
          ? "flex h-full min-h-[160px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black"
          : "aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      }
    >
      {showOpenInNewTab ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 px-2 py-1.5 text-center text-[11px] font-medium text-violet-400 hover:bg-zinc-900/90 hover:underline sm:text-xs"
        >
          Open host video in new tab
        </a>
      ) : null}
      <iframe
        title={title}
        src={src}
        className={fill ? "min-h-0 min-w-0 flex-1 border-0" : "h-full w-full border-0"}
        allow={BROADCAST_IFRAME_ALLOW}
      />
    </div>
  );
}
