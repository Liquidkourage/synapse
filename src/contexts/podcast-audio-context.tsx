"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PodcastAudioTrack = {
  src: string;
  title: string;
  episodeHref?: string;
};

type PodcastAudioContextValue = {
  track: PodcastAudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (track: PodcastAudioTrack) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  clear: () => void;
  isActiveSource: (src: string) => boolean;
};

const PodcastAudioContext = createContext<PodcastAudioContextValue | null>(null);

export function usePodcastAudio(): PodcastAudioContextValue {
  const ctx = useContext(PodcastAudioContext);
  if (!ctx) {
    throw new Error("usePodcastAudio must be used within PodcastAudioProvider");
  }
  return ctx;
}

export function PodcastAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PodcastAudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isActiveSource = useCallback(
    (src: string) => !!track && track.src === src,
    [track],
  );

  const play = useCallback((next: PodcastAudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (track?.src === next.src) {
      if (audio.paused) {
        void audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    setTrack(next);
    setCurrentTime(0);
    setDuration(0);
    audio.src = next.src;
    audio.load();
    void audio.play().catch(() => setIsPlaying(false));
  }, [track?.src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [track]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const clear = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (!track || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "Synapse",
    });

    navigator.mediaSession.setActionHandler("play", () => {
      void audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      const audio = audioRef.current;
      if (audio) seek(Math.max(0, audio.currentTime - 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      const audio = audioRef.current;
      if (audio) seek(Math.min(audio.duration || audio.currentTime + 10, audio.currentTime + 10));
    });

    return () => {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [track, seek]);

  const value = useMemo(
    () => ({
      track,
      isPlaying,
      currentTime,
      duration,
      play,
      toggle,
      seek,
      clear,
      isActiveSource,
    }),
    [track, isPlaying, currentTime, duration, play, toggle, seek, clear, isActiveSource],
  );

  return (
    <PodcastAudioContext.Provider value={value}>
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden />
      {children}
    </PodcastAudioContext.Provider>
  );
}
