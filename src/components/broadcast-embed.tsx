/** Permissions for B2B video SDK iframes (Daily, Mux Live, 100ms, etc.). */
const BROADCAST_IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture; autoplay; clipboard-write";

export function BroadcastEmbed({
  src,
  title = "Live broadcast",
}: {
  src: string;
  title?: string;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
      <iframe
        title={title}
        src={src}
        className="h-full w-full border-0"
        allow={BROADCAST_IFRAME_ALLOW}
        allowFullScreen
      />
    </div>
  );
}
