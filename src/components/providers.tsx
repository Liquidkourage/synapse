"use client";

import { SessionProvider } from "next-auth/react";
import { PodcastAudioProvider } from "@/contexts/podcast-audio-context";
import { PodcastAudioShell } from "@/components/podcast-audio-shell";
import { PodcastGlobalPlayer } from "@/components/podcast-global-player";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus>
      <PodcastAudioProvider>
        <PodcastAudioShell>{children}</PodcastAudioShell>
        <PodcastGlobalPlayer />
      </PodcastAudioProvider>
    </SessionProvider>
  );
}
