"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePodcastAudio } from "@/contexts/podcast-audio-context";
import { formatMediaTime } from "@/lib/format-media-time";

export function PodcastGlobalPlayer() {
  const pathname = usePathname() ?? "";
  const { track, isPlaying, currentTime, duration, toggle, seek, clear } = usePodcastAudio();

  if (pathname.startsWith("/embed/") || !track) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-500/30 bg-zinc-950/95 backdrop-blur-md"
      role="region"
      aria-label="Now playing"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {track.episodeHref ? (
            <Link
              href={track.episodeHref}
              className="block truncate text-sm font-medium text-white hover:text-violet-200"
            >
              {track.title}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-white">{track.title}</p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
              {formatMediaTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={duration ? currentTime : 0}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-violet-500"
              aria-label="Seek"
            />
            <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
              {formatMediaTime(duration)}
            </span>
          </div>
          <div
            className="mt-1 h-0.5 overflow-hidden rounded-full bg-zinc-800 sm:hidden"
            aria-hidden
          >
            <div className="h-full bg-violet-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Stop and close player"
        >
          Close
        </button>
      </div>
    </div>
  );
}
