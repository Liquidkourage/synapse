import type { PodcastEmbed } from "@/lib/podcast-embed";

const IFRAME_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";

export function PodcastEmbedPlayer({ embed, title }: { embed: PodcastEmbed; title: string }) {
  if (embed.kind === "audio") {
    return (
      <audio controls preload="metadata" className="w-full" src={embed.src} title={title} />
    );
  }

  const heightClass = embed.aspect === "video" ? "aspect-video min-h-[200px]" : "h-[152px] min-h-[152px]";

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 ${heightClass}`}>
      <iframe
        title={title}
        src={embed.src}
        className="h-full w-full border-0"
        allow={IFRAME_ALLOW}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
