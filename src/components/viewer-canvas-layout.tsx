"use client";

import { Rnd } from "react-rnd";
import type { ResizeDirection } from "re-resizable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LS_PREFIX = "synapse-viewer-canvas-v1";

type PanelId = "video" | "primary" | "secondary";

type PanelGeom = {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type Stored = Partial<Record<PanelId, PanelGeom>>;

function loadStored(key: string): Stored {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}:${key}`);
    if (!raw) return {};
    return JSON.parse(raw) as Stored;
  } catch {
    return {};
  }
}

function saveStored(key: string, data: Stored) {
  try {
    localStorage.setItem(`${LS_PREFIX}:${key}`, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function defaultGeoms(
  w: number,
  h: number,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
): Stored {
  const m = 10;
  const safeW = Math.max(320, w);
  const safeH = Math.max(400, h);

  if (hasVideo && hasPrimary && hasSecondary) {
    const topH = Math.round(safeH * 0.36);
    const rowTop = m;
    const rowBottom = rowTop + topH + m;
    const bottomH = safeH - rowBottom - m;
    const colW = Math.floor((safeW - m * 3) / 2);
    return {
      video: { x: m, y: rowTop, width: safeW - m * 2, height: topH, z: 1 },
      primary: { x: m, y: rowBottom, width: colW, height: bottomH, z: 2 },
      secondary: { x: m * 2 + colW, y: rowBottom, width: colW, height: bottomH, z: 3 },
    };
  }
  if (hasVideo && (hasPrimary || hasSecondary)) {
    const topH = Math.round(safeH * 0.42);
    const rest: Stored = {
      video: { x: m, y: m, width: safeW - m * 2, height: topH, z: 1 },
    };
    if (hasPrimary) {
      rest.primary = { x: m, y: m + topH + m, width: safeW - m * 2, height: safeH - topH - m * 3, z: 2 };
    }
    if (hasSecondary) {
      rest.secondary = { x: m, y: m + topH + m, width: safeW - m * 2, height: safeH - topH - m * 3, z: 2 };
    }
    return rest;
  }
  if (hasPrimary && hasSecondary) {
    const colW = Math.floor((safeW - m * 3) / 2);
    return {
      primary: { x: m, y: m, width: colW, height: safeH - m * 2, z: 1 },
      secondary: { x: m * 2 + colW, y: m, width: colW, height: safeH - m * 2, z: 2 },
    };
  }
  const full: PanelGeom = { x: m, y: m, width: safeW - m * 2, height: safeH - m * 2, z: 1 };
  if (hasVideo) return { video: full };
  if (hasPrimary) return { primary: full };
  if (hasSecondary) return { secondary: full };
  return {};
}

function mergeSavedWithDefaults(
  saved: Stored,
  w: number,
  h: number,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
): Stored {
  const d = defaultGeoms(w, h, hasVideo, hasPrimary, hasSecondary);
  const out: Stored = {};
  if (hasVideo) out.video = saved.video ?? d.video;
  if (hasPrimary) out.primary = saved.primary ?? d.primary;
  if (hasSecondary) out.secondary = saved.secondary ?? d.secondary;
  return out;
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
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-2 py-1.5">
      <span className="synapse-panel-drag cursor-grab text-xs font-medium text-zinc-400 active:cursor-grabbing">
        {label}
      </span>
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
    <div className="min-h-0 min-w-0 flex-1 overflow-auto" style={{ zoom }}>
      <div className="h-full min-h-[80px] w-full min-w-0">{children}</div>
    </div>
  );
}

export function ViewerCanvasLayout({
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const initOnceRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [geoms, setGeoms] = useState<Stored>({});
  const [zoom, setZoom] = useState({ video: 1, primary: 1, secondary: 1 });
  const maxZRef = useRef(3);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    initOnceRef.current = false;
    setGeoms({});
  }, [storageKey]);

  const applyLayout = useCallback(
    (next: Stored) => {
      saveStored(storageKey, next);
      setGeoms(next);
      maxZRef.current = Math.max(1, ...Object.values(next).map((g) => g?.z ?? 1));
    },
    [storageKey],
  );

  const initFromCanvas = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 80 || h < 80) return;

    const saved = loadStored(storageKey);
    const merged = mergeSavedWithDefaults(saved, w, h, hasVideo, hasPrimary, hasSecondary);
    applyLayout(merged);
  }, [storageKey, hasVideo, hasPrimary, hasSecondary, applyLayout]);

  useEffect(() => {
    if (!mounted) return;
    const el = canvasRef.current;
    if (!el) return;

    const tryInit = () => {
      if (initOnceRef.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) return;
      initOnceRef.current = true;
      initFromCanvas();
    };

    tryInit();
    const ro = new ResizeObserver(tryInit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, initFromCanvas, storageKey]);

  const bringToFront = useCallback(
    (id: PanelId) => {
      setGeoms((prev) => {
        const g = prev[id];
        if (!g) return prev;
        maxZRef.current += 1;
        const updated = { ...prev, [id]: { ...g, z: maxZRef.current } };
        saveStored(storageKey, updated);
        return updated;
      });
    },
    [storageKey],
  );

  const updateGeom = useCallback(
    (id: PanelId, patch: Partial<PanelGeom>) => {
      setGeoms((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        const next = { ...prev, [id]: { ...cur, ...patch } };
        saveStored(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(`${LS_PREFIX}:${storageKey}`);
    } catch {
      /* */
    }
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 80) return;
    const merged = mergeSavedWithDefaults({}, rect.width, rect.height, hasVideo, hasPrimary, hasSecondary);
    applyLayout(merged);
    initOnceRef.current = true;
  }, [storageKey, hasVideo, hasPrimary, hasSecondary, applyLayout]);

  const onDragStop = useCallback(
    (id: PanelId) => (_e: unknown, d: { x: number; y: number }) => {
      updateGeom(id, { x: d.x, y: d.y });
    },
    [updateGeom],
  );

  const onResizeStop = useCallback(
    (id: PanelId) =>
      (
        _e: MouseEvent | TouchEvent,
        _dir: ResizeDirection,
        ref: HTMLElement,
        _delta: { width: number; height: number },
        pos: { x: number; y: number },
      ) => {
        updateGeom(id, {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: pos.x,
          y: pos.y,
        });
      },
    [updateGeom],
  );

  const renderPanel = (
    id: PanelId,
    label: string,
    content: React.ReactNode,
    zm: number,
    onZoom: (z: number) => void,
  ) => {
    const g = geoms[id];
    if (!g) return null;
    return (
      <Rnd
        key={id}
        bounds="parent"
        cancel="button"
        dragHandleClassName="synapse-panel-drag"
        size={{ width: g.width, height: g.height }}
        position={{ x: g.x, y: g.y }}
        minWidth={260}
        minHeight={140}
        style={{ zIndex: g.z }}
        enableResizing={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        onDragStart={() => bringToFront(id)}
        onResizeStart={() => bringToFront(id)}
        onDragStop={onDragStop(id)}
        onResizeStop={onResizeStop(id)}
        className="flex flex-col overflow-hidden rounded-xl border border-zinc-700/90 bg-black shadow-xl shadow-black/40"
      >
        <div className="flex h-full min-h-0 flex-col" onPointerDownCapture={() => bringToFront(id)}>
          <PanelToolbar label={label} zoom={zm} onZoom={onZoom} />
          <ZoomFrame zoom={zm}>{content}</ZoomFrame>
        </div>
      </Rnd>
    );
  };

  const setVideoZoom = useCallback((z: number) => setZoom((s) => ({ ...s, video: z })), []);
  const setPrimaryZoom = useCallback((z: number) => setZoom((s) => ({ ...s, primary: z })), []);
  const setSecondaryZoom = useCallback((z: number) => setZoom((s) => ({ ...s, secondary: z })), []);

  const footer = useMemo(
    () => (
      <p className="shrink-0 text-xs text-zinc-600">
        Drag the <strong className="text-zinc-500">title bar</strong> to move. Drag edges or corners to resize.{" "}
        <button type="button" onClick={resetLayout} className="text-violet-400 hover:underline">
          Reset layout
        </button>
      </p>
    ),
    [resetLayout],
  );

  if (!mounted) {
    return (
      <div className="flex min-h-[min(85dvh,calc(100dvh-12rem))] w-full flex-col gap-2">
        <div className="min-h-[320px] w-full animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        {footer}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2">
      <div className="shrink-0 text-xs text-zinc-500">
        Free-form canvas — windows stay within the shaded area; scroll if the canvas is larger than your screen.
      </div>
      <div
        ref={canvasRef}
        className="relative min-h-[min(85dvh,calc(100dvh-12rem))] w-full flex-1 overflow-auto rounded-2xl border border-zinc-800/90 bg-[radial-gradient(ellipse_at_top,_rgba(39,39,42,0.5),_transparent_60%),linear-gradient(180deg,_rgb(9,9,11)_0%,_rgb(24,24,27)_100%)] ring-1 ring-zinc-700/30"
      >
        {hasVideo && renderPanel("video", videoLabel, video, zoom.video, setVideoZoom)}
        {hasPrimary && renderPanel("primary", primaryLabel, primary, zoom.primary, setPrimaryZoom)}
        {hasSecondary && renderPanel("secondary", secondaryLabel, secondary, zoom.secondary, setSecondaryZoom)}
      </div>
      {footer}
    </div>
  );
}
