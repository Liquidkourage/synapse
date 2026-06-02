"use client";

import { usePodcastAudio } from "@/contexts/podcast-audio-context";
import { formatMediaTime } from "@/lib/format-media-time";

export function PodcastAudioPlayer({
  src,
  title,
  episodeHref,
  prominent = false,
}: {
  src: string;
  title: string;
  episodeHref?: string;
  prominent?: boolean;
}) {
  const { play, toggle, isPlaying, currentTime, duration, seek, isActiveSource } = usePodcastAudio();
  const active = isActiveSource(src);

  const shellClass = prominent
    ? "rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5"
    : "rounded-xl border border-zinc-800 bg-zinc-900/40 p-3";

  if (!active) {
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={() => play({ src, title, episodeHref })}
          className={
            prominent
              ? "flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              : "flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600"
          }
        >
          <PlayIcon />
          Play episode
        </button>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Keeps playing as you browse the site
        </p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon className="translate-x-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          <p className="text-[11px] text-zinc-500">Playing — use the bar below when you leave this page</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">{formatMediaTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={duration ? currentTime : 0}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-violet-500"
          aria-label="Seek"
        />
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">{formatMediaTime(duration)}</span>
      </div>
    </div>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
