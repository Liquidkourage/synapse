import { PodcastAudioPlayer } from "@/components/podcast-audio-player";
import type { PodcastEmbed } from "@/lib/podcast-embed";

const IFRAME_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";

export function PodcastEmbedPlayer({
  embed,
  title,
  prominent = false,
  episodeHref,
}: {
  embed: PodcastEmbed;
  title: string;
  /** Taller player for dedicated podcast episode pages. */
  prominent?: boolean;
  /** Link for the sticky player title (direct audio only). */
  episodeHref?: string;
}) {
  if (embed.kind === "audio") {
    return (
      <PodcastAudioPlayer src={embed.src} title={title} episodeHref={episodeHref} prominent={prominent} />
    );
  }

  const heightClass = prominent
    ? embed.aspect === "video"
      ? "aspect-video min-h-[280px] sm:min-h-[360px]"
      : "h-[232px] min-h-[232px] sm:h-[352px] sm:min-h-[352px]"
    : embed.aspect === "video"
      ? "aspect-video min-h-[200px]"
      : "h-[152px] min-h-[152px]";

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
