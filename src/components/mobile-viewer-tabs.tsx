"use client";

import { useEffect, useRef, useState } from "react";

export type MobileTabId = "video" | "primary" | "secondary" | "chat";

type TabDef = { id: MobileTabId; label: string; content: React.ReactNode };

type Props = {
  hasVideo: boolean;
  hasPrimary: boolean;
  hasSecondary: boolean;
  videoLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
  video: React.ReactNode;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  chatSlot?: React.ReactNode;
  /** Host-published default tab (semantic mobile layout). Ignored after the user picks a tab. */
  defaultTabId?: MobileTabId;
};

function mobileLabelForVideo(printLabel: string): string {
  const s = printLabel.trim();
  if (s.length <= 12) return s;
  return "Video";
}

export function MobileViewerTabs({
  hasVideo,
  hasPrimary,
  hasSecondary,
  videoLabel,
  primaryLabel,
  secondaryLabel,
  video,
  primary,
  secondary,
  chatSlot,
  defaultTabId,
}: Props) {
  const tabs: TabDef[] = [];
  if (hasVideo) tabs.push({ id: "video", label: mobileLabelForVideo(videoLabel), content: video });
  if (hasPrimary) tabs.push({ id: "primary", label: primaryLabel.length > 14 ? "Game" : primaryLabel, content: primary });
  if (hasSecondary)
    tabs.push({
      id: "secondary",
      label: secondaryLabel.length > 14 ? "Extra" : secondaryLabel,
      content: secondary,
    });
  if (chatSlot) {
    tabs.push({
      id: "chat",
      label: "Chat",
      content: (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-1">{chatSlot}</div>
      ),
    });
  }

  const [active, setActive] = useState(0);
  const userPickedTab = useRef(false);

  useEffect(() => {
    userPickedTab.current = false;
  }, [defaultTabId]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, tabs.length - 1)));
  }, [tabs.length]);

  useEffect(() => {
    if (userPickedTab.current || !defaultTabId || tabs.length === 0) return;
    const i = tabs.findIndex((t) => t.id === defaultTabId);
    if (i >= 0) setActive(i);
  }, [defaultTabId, hasVideo, hasPrimary, hasSecondary, Boolean(chatSlot), videoLabel, primaryLabel, secondaryLabel]);

  if (tabs.length === 0) return null;

  const safeIndex = Math.min(active, tabs.length - 1);
  const panel = tabs[safeIndex];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {tabs.length > 1 ? (
        <div
          role="tablist"
          aria-label="Viewer panels"
          className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950/80 px-1 pb-0 pt-1"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                i === safeIndex
                  ? "bg-zinc-900 text-white ring-1 ring-zinc-700 ring-b-transparent"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => {
                userPickedTab.current = true;
                setActive(i);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        role="tabpanel"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [min-height:min(55dvh,560px)] md:min-h-0"
      >
        {panel?.content}
      </div>
    </div>
  );
}
