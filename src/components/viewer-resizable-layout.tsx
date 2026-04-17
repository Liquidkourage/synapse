"use client";

import {
  Group,
  Panel,
  Separator,
  useGroupRef,
  type Layout,
} from "react-resizable-panels";
import { useCallback, useEffect, useMemo, useState } from "react";

const LS_PREFIX = "synapse-viewer-layout-v2";

function loadLayout(key: string): Layout | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}:${key}`);
    if (!raw) return undefined;
    return JSON.parse(raw) as Layout;
  } catch {
    return undefined;
  }
}

function saveLayout(key: string, layout: Layout) {
  try {
    localStorage.setItem(`${LS_PREFIX}:${key}`, JSON.stringify(layout));
  } catch {
    /* ignore quota */
  }
}

function PanelToolbar({
  label,
  zoom,
  onZoom,
}: {
  label: string;
  zoom: number;
  onZoom: (z: number) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/80 px-2 py-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onZoom(Math.max(0.5, Math.round((zoom - 0.1) * 100) / 100))}
          className="rounded border border-zinc-600 px-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-zinc-500">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => onZoom(Math.min(1.75, Math.round((zoom + 0.1) * 100) / 100))}
          className="rounded border border-zinc-600 px-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onZoom(1)}
          className="ml-1 rounded border border-zinc-700 px-1.5 text-[10px] text-zinc-500 hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function ZoomFrame({ zoom, children }: { zoom: number; children: React.ReactNode }) {
  return (
    <div
      className="min-h-0 min-w-0 flex-1 overflow-auto"
      style={{
        zoom,
      }}
    >
      <div className="h-full min-h-[120px] w-full min-w-0">{children}</div>
    </div>
  );
}

type PresetId = "balanced" | "smallVideo" | "largeDisplay";

export function ViewerResizableLayout({
  storageKey,
  video,
  primary,
  secondary,
  hasVideo,
  hasPrimary,
  hasSecondary,
  videoLabel = "Synapse video",
  primaryLabel = "Game / tool (primary)",
  secondaryLabel = "Second embed (e.g. public display)",
}: {
  storageKey: string;
  video?: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  hasVideo: boolean;
  hasPrimary: boolean;
  hasSecondary: boolean;
  videoLabel?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const mainKey = `${storageKey}-main`;
  const embedKey = `${storageKey}-embeds`;
  const mainGroupRef = useGroupRef();
  const embedGroupRef = useGroupRef();

  const [zoom, setZoom] = useState({ video: 1, primary: 1, secondary: 1 });
  const [embedOrder, setEmbedOrder] = useState<"primaryFirst" | "secondaryFirst">("primaryFirst");

  const mainDefault = useMemo((): Layout | undefined => {
    const saved = loadLayout(mainKey);
    if (saved) return saved;
    if (hasVideo && (hasPrimary || hasSecondary)) return { video: 42, "embed-row": 58 };
    return undefined;
  }, [mainKey, hasVideo, hasPrimary, hasSecondary]);

  const embedDefault = useMemo((): Layout | undefined => {
    const saved = loadLayout(embedKey);
    if (saved) return saved;
    if (hasPrimary && hasSecondary) return { "embed-a": 50, "embed-b": 50 };
    return undefined;
  }, [embedKey, hasPrimary, hasSecondary]);

  const onMainLayout = useCallback(
    (layout: Layout) => {
      saveLayout(mainKey, layout);
    },
    [mainKey],
  );

  const onEmbedLayout = useCallback(
    (layout: Layout) => {
      saveLayout(embedKey, layout);
    },
    [embedKey],
  );

  const applyPreset = useCallback(
    (preset: PresetId) => {
      if (hasVideo && (hasPrimary || hasSecondary)) {
        const layouts: Record<PresetId, Layout> = {
          balanced: { video: 40, "embed-row": 60 },
          smallVideo: { video: 18, "embed-row": 82 },
          largeDisplay: { video: 28, "embed-row": 72 },
        };
        mainGroupRef.current?.setLayout(layouts[preset]);
      }
      if (hasPrimary && hasSecondary) {
        if (preset === "largeDisplay") {
          embedGroupRef.current?.setLayout({ "embed-a": 32, "embed-b": 68 });
        } else if (preset === "smallVideo") {
          embedGroupRef.current?.setLayout({ "embed-a": 55, "embed-b": 45 });
        } else {
          embedGroupRef.current?.setLayout({ "embed-a": 50, "embed-b": 50 });
        }
      }
    },
    [hasVideo, hasPrimary, hasSecondary, mainGroupRef, embedGroupRef],
  );

  const leftEmbed = embedOrder === "primaryFirst" ? primary : secondary;
  const rightEmbed = embedOrder === "primaryFirst" ? secondary : primary;
  const leftLabel = embedOrder === "primaryFirst" ? primaryLabel : secondaryLabel;
  const rightLabel = embedOrder === "primaryFirst" ? secondaryLabel : primaryLabel;
  const leftZoom = embedOrder === "primaryFirst" ? zoom.primary : zoom.secondary;
  const rightZoom = embedOrder === "primaryFirst" ? zoom.secondary : zoom.primary;
  const setLeftZoom = (z: number) =>
    embedOrder === "primaryFirst"
      ? setZoom((s) => ({ ...s, primary: z }))
      : setZoom((s) => ({ ...s, secondary: z }));
  const setRightZoom = (z: number) =>
    embedOrder === "primaryFirst"
      ? setZoom((s) => ({ ...s, secondary: z }))
      : setZoom((s) => ({ ...s, primary: z }));

  const showToolbar = hasVideo || hasPrimary || hasSecondary;

  /** Single panel: no Group */
  if (hasVideo && !hasPrimary && !hasSecondary) {
    return (
      <div className="flex min-h-0 w-full flex-col gap-2">
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            Drag panel edges to resize. Use zoom if text feels small.
          </div>
        )}
        <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-black">
          <PanelToolbar label={videoLabel} zoom={zoom.video} onZoom={(z) => setZoom((s) => ({ ...s, video: z }))} />
          <ZoomFrame zoom={zoom.video}>{video}</ZoomFrame>
        </div>
      </div>
    );
  }

  if (!hasVideo && hasPrimary && !hasSecondary) {
    return (
      <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-black">
        <PanelToolbar label={primaryLabel} zoom={zoom.primary} onZoom={(z) => setZoom((s) => ({ ...s, primary: z }))} />
        <ZoomFrame zoom={zoom.primary}>{primary}</ZoomFrame>
      </div>
    );
  }

  if (!hasVideo && !hasPrimary && hasSecondary) {
    return (
      <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-black">
        <PanelToolbar
          label={secondaryLabel}
          zoom={zoom.secondary}
          onZoom={(z) => setZoom((s) => ({ ...s, secondary: z }))}
        />
        <ZoomFrame zoom={zoom.secondary}>{secondary}</ZoomFrame>
      </div>
    );
  }

  if (!hasVideo && hasPrimary && hasSecondary) {
    return (
      <div className="flex w-full flex-col gap-2">
        <PresetBar
          hasPair
          onPreset={applyPreset}
          onSwap={() => setEmbedOrder((o) => (o === "primaryFirst" ? "secondaryFirst" : "primaryFirst"))}
        />
        <div className="min-h-[min(70vh,640px)] w-full min-w-0">
          <Group
            groupRef={embedGroupRef}
            orientation="horizontal"
            id={`${storageKey}-embeds-only`}
            defaultLayout={embedDefault}
            onLayoutChanged={onEmbedLayout}
            className="h-full min-h-[400px] w-full"
          >
            <Panel id="embed-a" defaultSize="50%" minSize={15} className="min-w-0">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <PanelToolbar label={leftLabel} zoom={leftZoom} onZoom={setLeftZoom} />
                <ZoomFrame zoom={leftZoom}>{leftEmbed}</ZoomFrame>
              </div>
            </Panel>
            <Separator className="w-2 shrink-0 bg-zinc-800 hover:bg-violet-500/30 data-[separator]:cursor-col-resize" />
            <Panel id="embed-b" defaultSize="50%" minSize={15} className="min-w-0">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <PanelToolbar label={rightLabel} zoom={rightZoom} onZoom={setRightZoom} />
                <ZoomFrame zoom={rightZoom}>{rightEmbed}</ZoomFrame>
              </div>
            </Panel>
          </Group>
        </div>
      </div>
    );
  }

  /** Video + one or two embeds: vertical + optional horizontal */
  return (
    <div className="flex w-full flex-col gap-2">
      <PresetBar
        hasPair={hasPrimary && hasSecondary}
        onPreset={applyPreset}
        onSwap={
          hasPrimary && hasSecondary
            ? () => setEmbedOrder((o) => (o === "primaryFirst" ? "secondaryFirst" : "primaryFirst"))
            : undefined
        }
      />
      <div className="min-h-[min(75vh,720px)] w-full min-w-0 md:min-h-[480px]">
        <Group
          groupRef={mainGroupRef}
          orientation="vertical"
          id={`${storageKey}-main`}
          defaultLayout={mainDefault}
          onLayoutChanged={onMainLayout}
          className="h-full min-h-[420px] w-full"
        >
          {hasVideo && (
            <>
              <Panel id="video" defaultSize="42%" minSize={12} className="min-h-0">
                <div className="flex h-full min-h-[140px] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-black">
                  <PanelToolbar label={videoLabel} zoom={zoom.video} onZoom={(z) => setZoom((s) => ({ ...s, video: z }))} />
                  <ZoomFrame zoom={zoom.video}>{video}</ZoomFrame>
                </div>
              </Panel>
              <Separator className="h-2 shrink-0 bg-zinc-800 hover:bg-violet-500/30 data-[separator]:cursor-row-resize" />
            </>
          )}

          <Panel id="embed-row" defaultSize="58%" minSize={hasVideo ? 20 : 50} className="min-h-0">
            {hasPrimary && hasSecondary ? (
              <Group
                groupRef={embedGroupRef}
                orientation="horizontal"
                id={`${storageKey}-embeds`}
                defaultLayout={embedDefault}
                onLayoutChanged={onEmbedLayout}
                className="h-full min-h-[200px] w-full"
              >
                <Panel id="embed-a" defaultSize="50%" minSize={15} className="min-h-0 min-w-0">
                  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                    <PanelToolbar label={leftLabel} zoom={leftZoom} onZoom={setLeftZoom} />
                    <ZoomFrame zoom={leftZoom}>{leftEmbed}</ZoomFrame>
                  </div>
                </Panel>
                <Separator className="w-2 shrink-0 bg-zinc-800 hover:bg-violet-500/30 data-[separator]:cursor-col-resize" />
                <Panel id="embed-b" defaultSize="50%" minSize={15} className="min-h-0 min-w-0">
                  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                    <PanelToolbar label={rightLabel} zoom={rightZoom} onZoom={setRightZoom} />
                    <ZoomFrame zoom={rightZoom}>{rightEmbed}</ZoomFrame>
                  </div>
                </Panel>
              </Group>
            ) : hasPrimary ? (
              <div className="flex h-full min-h-[200px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <PanelToolbar label={primaryLabel} zoom={zoom.primary} onZoom={(z) => setZoom((s) => ({ ...s, primary: z }))} />
                <ZoomFrame zoom={zoom.primary}>{primary}</ZoomFrame>
              </div>
            ) : hasSecondary ? (
              <div className="flex h-full min-h-[200px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <PanelToolbar
                  label={secondaryLabel}
                  zoom={zoom.secondary}
                  onZoom={(z) => setZoom((s) => ({ ...s, secondary: z }))}
                />
                <ZoomFrame zoom={zoom.secondary}>{secondary}</ZoomFrame>
              </div>
            ) : null}
          </Panel>
        </Group>
      </div>
      <p className="text-xs text-zinc-600">
        Layout is saved in this browser. Drag dividers to resize. Presets adjust video vs embeds; &quot;Big display&quot; widens the
        right column when two embeds are open. Swap flips which side is primary vs secondary.
      </p>
    </div>
  );
}

function PresetBar({
  hasPair,
  onPreset,
  onSwap,
}: {
  hasPair: boolean;
  onPreset: (p: PresetId) => void;
  onSwap?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">Layout:</span>
      <button
        type="button"
        onClick={() => onPreset("balanced")}
        className="rounded-full border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
      >
        Balanced
      </button>
      <button
        type="button"
        onClick={() => onPreset("smallVideo")}
        className="rounded-full border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
      >
        Small video
      </button>
      <button
        type="button"
        onClick={() => onPreset("largeDisplay")}
        className="rounded-full border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
      >
        Big display
      </button>
      {hasPair && onSwap && (
        <button
          type="button"
          onClick={onSwap}
          className="rounded-full border border-violet-500/40 px-3 py-1 text-xs text-violet-300 hover:bg-violet-950/40"
        >
          Swap left / right
        </button>
      )}
    </div>
  );
}
