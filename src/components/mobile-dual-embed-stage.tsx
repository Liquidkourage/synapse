"use client";

import type { ReactNode } from "react";
import { useRef, useSyncExternalStore } from "react";

/** Layout is only used below `md`; still distinguish phone portrait vs landscape for split axis. */
function subscribeLandscape(onChange: () => void) {
  const mq = window.matchMedia("(orientation: landscape)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getLandscapeSnapshot() {
  return window.matchMedia("(orientation: landscape)").matches;
}

function getLandscapeServerSnapshot() {
  return false;
}

function useMobileLandscape() {
  return useSyncExternalStore(subscribeLandscape, getLandscapeSnapshot, getLandscapeServerSnapshot);
}

type Props = {
  hasVideo: boolean;
  video: ReactNode;
  primary: ReactNode;
  secondary: ReactNode;
  chatSlot?: ReactNode;
};

/**
 * Mobile-only: show public display + game at once (equal split).
 * Host video is a short strip above; chat opens full-screen from a slim bar.
 */
export function MobileDualEmbedStage({ hasVideo, video, primary, secondary, chatSlot }: Props) {
  const landscape = useMobileLandscape();
  const chatDialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {hasVideo ? (
        <div
          className="relative w-full shrink-0 overflow-hidden border-b border-zinc-800 bg-black"
          style={{ height: "min(22dvh, 136px)" }}
        >
          <div className="absolute inset-0 min-h-0 min-w-0">{video}</div>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Public display and game"
        className={`flex min-h-0 flex-1 flex-col gap-px bg-zinc-800 ${landscape ? "flex-row" : "flex-col"}`}
      >
        <section
          aria-label="Public display"
          className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col bg-zinc-950"
        >
          <header className="shrink-0 border-b border-zinc-800/90 bg-zinc-900/60 px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Public display</span>
          </header>
          <div className="min-h-0 min-w-0 flex-1">{secondary}</div>
        </section>
        <section aria-label="Game" className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col bg-zinc-950">
          <header className="shrink-0 border-b border-zinc-800/90 bg-zinc-900/60 px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Game</span>
          </header>
          <div className="min-h-0 min-w-0 flex-1">{primary}</div>
        </section>
      </div>

      {chatSlot ? (
        <>
          <div className="flex shrink-0 items-center justify-end border-t border-zinc-800 bg-zinc-950/95 px-2 py-1">
            <button
              type="button"
              className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600"
              onClick={() => chatDialogRef.current?.showModal()}
            >
              Chat
            </button>
          </div>

          <dialog
            ref={chatDialogRef}
            className="fixed inset-0 z-[100] m-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-zinc-950 p-0 text-zinc-100 outline-none [&::backdrop]:bg-black/80"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2">
              <span className="text-sm font-medium text-white">Chat</span>
              <button
                type="button"
                className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                onClick={() => chatDialogRef.current?.close()}
              >
                Close
              </button>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-1 pb-2 pt-1">
              {chatSlot}
            </div>
          </dialog>
        </>
      ) : null}
    </div>
  );
}
