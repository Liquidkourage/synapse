"use client";

import { usePodcastAudio } from "@/contexts/podcast-audio-context";

/** Reserves space for the fixed global podcast player so content is not covered. */
export function PodcastAudioShell({ children }: { children: React.ReactNode }) {
  const { track } = usePodcastAudio();

  return (
    <div className={track ? "flex min-h-0 flex-1 flex-col pb-[4.75rem]" : "flex min-h-0 flex-1 flex-col"}>
      {children}
    </div>
  );
}
