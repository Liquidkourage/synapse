"use client";

import { Rnd } from "react-rnd";
import type { ResizeDirection } from "re-resizable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  denormalizeV1ToPixelPanels,
  normalizePixelPanelsToV1,
  VIEWER_CANVAS_MARGIN,
  type ViewerCanvasLayoutV1,
  type ViewerMobileTabId,
} from "@/lib/viewer-canvas-layout-geometry";

const LS_PREFIX = "synapse-viewer-canvas-v1";
const LS_USER_PREFIX = "synapse-viewer-canvas-user-v1";

type PanelId = "video" | "primary" | "secondary";

type PanelGeom = {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type Stored = Partial<Record<PanelId, PanelGeom>>;

const CANVAS_MARGIN = VIEWER_CANVAS_MARGIN;
const PANEL_MIN_W = 260;
const PANEL_MIN_H = 140;

/** Keep floating panels inside the canvas (localStorage may hold sizes from a wider/taller window). */
function clampGeom(g: PanelGeom, canvasW: number, canvasH: number): PanelGeom {
  const m = CANVAS_MARGIN;
  const maxW = Math.max(PANEL_MIN_W, canvasW - m * 2);
  const maxH = Math.max(PANEL_MIN_H, canvasH - m * 2);
  let { x, y, width, height, z } = g;
  width = Math.min(Math.max(PANEL_MIN_W, width), maxW);
  height = Math.min(Math.max(PANEL_MIN_H, height), maxH);
  x = Math.max(m, Math.min(x, canvasW - width - m));
  y = Math.max(m, Math.min(y, canvasH - height - m));
  return { x, y, width, height, z };
}

function clampStored(
  stored: Stored,
  canvasW: number,
  canvasH: number,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
): Stored {
  const out: Stored = { ...stored };
  if (hasVideo && out.video) out.video = clampGeom(out.video, canvasW, canvasH);
  if (hasPrimary && out.primary) out.primary = clampGeom(out.primary, canvasW, canvasH);
  if (hasSecondary && out.secondary) out.secondary = clampGeom(out.secondary, canvasW, canvasH);
  return out;
}

function loadUserLocked(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${LS_USER_PREFIX}:${key}`) === "1";
  } catch {
    return false;
  }
}

function setUserLocked(key: string) {
  try {
    localStorage.setItem(`${LS_USER_PREFIX}:${key}`, "1");
  } catch {
    /* */
  }
}

function clearUserLocked(key: string) {
  try {
    localStorage.removeItem(`${LS_USER_PREFIX}:${key}`);
  } catch {
    /* */
  }
}

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
  return clampStored(out, w, h, hasVideo, hasPrimary, hasSecondary);
}

/** Host normalized layout denormalized + fills missing panels from built-in defaults. */
function mergeHostPixelsWithDefaults(
  hostPx: Stored,
  w: number,
  h: number,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
): Stored {
  const d = defaultGeoms(w, h, hasVideo, hasPrimary, hasSecondary);
  const out: Stored = { ...d, ...hostPx };
  return clampStored(out, w, h, hasVideo, hasPrimary, hasSecondary);
}

function PanelToolbar({
  label,
  zoom,
  onZoom,
  onToolbarClick,
}: {
  label: string;
  zoom: number;
  onZoom: (z: number) => void;
  /** Fires after mouse/touch release (not during pointerdown) so it does not fight react-rnd drag. */
  onToolbarClick?: () => void;
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-2 py-1.5"
      onClick={onToolbarClick}
    >
      <span className="synapse-panel-drag flex min-h-[2rem] min-w-0 flex-1 cursor-grab touch-none select-none items-center text-xs font-medium text-zinc-400 active:cursor-grabbing">
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

/** Stable position/size/style objects so react-rnd controlled mode does not reset on unrelated parent renders. */
function PanelRnd({
  x,
  y,
  width,
  height,
  z,
  onDrag,
  onDragStart,
  onDragStop,
  onResize,
  onResizeStart,
  onResizeStop,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  onDrag: (e: unknown, d: { x: number; y: number }) => void;
  onDragStart: () => void;
  onDragStop: (e: unknown, d: { x: number; y: number }) => void;
  onResize: (
    e: MouseEvent | TouchEvent,
    dir: ResizeDirection,
    ref: HTMLElement,
    delta: { width: number; height: number },
    pos: { x: number; y: number },
  ) => void;
  onResizeStart: () => void;
  onResizeStop: (
    e: MouseEvent | TouchEvent,
    dir: ResizeDirection,
    ref: HTMLElement,
    delta: { width: number; height: number },
    pos: { x: number; y: number },
  ) => void;
  children: React.ReactNode;
}) {
  const position = useMemo(() => ({ x, y }), [x, y]);
  const size = useMemo(() => ({ width, height }), [width, height]);
  const rndStyle = useMemo(() => ({ zIndex: z }), [z]);

  return (
    <Rnd
      bounds="parent"
      cancel="button"
      dragHandleClassName="synapse-panel-drag"
      size={size}
      position={position}
      minWidth={260}
      minHeight={140}
      style={rndStyle}
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
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragStop={onDragStop}
      onResizeStart={onResizeStart}
      onResize={onResize}
      onResizeStop={onResizeStop}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-700/90 bg-black shadow-xl shadow-black/40"
    >
      {children}
    </Rnd>
  );
}

function ZoomFrame({
  zoom,
  blockPointerEvents,
  children,
}: {
  zoom: number;
  /** If true, iframes cannot steal pointer events (needed while dragging/resizing floating panels). */
  blockPointerEvents?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`min-h-0 min-w-0 flex-1 overflow-auto ${blockPointerEvents ? "pointer-events-none" : ""}`}
      style={{ zoom }}
    >
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
  secondaryLabel = "Public display (second embed; e.g. VDO.Ninja viewer link)",
  compact = false,
  hostDefaultLayout = null,
  eventId = null,
  canPublishViewerLayout = false,
  hasMobileChatTab = false,
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
  compact?: boolean;
  /** Server-stored normalized layout — viewers use this until they customize (local override). */
  hostDefaultLayout?: ViewerCanvasLayoutV1 | null;
  eventId?: string | null;
  canPublishViewerLayout?: boolean;
  /** Whether mobile layout includes a Chat tab (for publish default tab options). */
  hasMobileChatTab?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layoutInitRef = useRef(false);
  const hostLayoutRef = useRef<ViewerCanvasLayoutV1 | null>(null);
  const userLockedRef = useRef(false);
  const maxZRef = useRef(3);
  hostLayoutRef.current = hostDefaultLayout ?? null;

  const hostLayoutSig = useMemo(
    () => (hostDefaultLayout ? JSON.stringify(hostDefaultLayout) : ""),
    [hostDefaultLayout],
  );

  const [mounted, setMounted] = useState(false);
  const [geoms, setGeoms] = useState<Stored>({});
  const [zoom, setZoom] = useState({ video: 1, primary: 1, secondary: 1 });
  const [canvasPointerLock, setCanvasPointerLock] = useState(false);
  const [publishMobileTab, setPublishMobileTab] = useState<ViewerMobileTabId>("video");
  const [publishState, setPublishState] = useState<"idle" | "saving" | "ok" | "err">("idle");

  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    layoutInitRef.current = false;
    setGeoms({});
  }, [storageKey, hostLayoutSig]);

  useEffect(() => {
    const d = hostDefaultLayout?.mobile?.defaultTab;
    if (d) setPublishMobileTab(d);
  }, [hostLayoutSig, hostDefaultLayout?.mobile?.defaultTab]);

  useEffect(() => {
    const ok =
      (publishMobileTab === "video" && hasVideo) ||
      (publishMobileTab === "primary" && hasPrimary) ||
      (publishMobileTab === "secondary" && hasSecondary) ||
      (publishMobileTab === "chat" && hasMobileChatTab);
    if (ok) return;
    if (hasVideo) setPublishMobileTab("video");
    else if (hasPrimary) setPublishMobileTab("primary");
    else if (hasSecondary) setPublishMobileTab("secondary");
    else if (hasMobileChatTab) setPublishMobileTab("chat");
  }, [hasVideo, hasPrimary, hasSecondary, hasMobileChatTab, publishMobileTab]);

  const applyLayout = useCallback(
    (next: Stored) => {
      saveStored(storageKey, next);
      setGeoms(next);
      maxZRef.current = Math.max(1, ...Object.values(next).map((g) => g?.z ?? 1));
    },
    [storageKey],
  );

  useEffect(() => {
    if (!mounted) return;
    const el = canvasRef.current;
    if (!el) return;

    const run = (w: number, h: number) => {
      if (w < 80 || h < 80) return;
      if (!layoutInitRef.current) {
        const locked = loadUserLocked(storageKey);
        userLockedRef.current = locked;
        let merged: Stored;
        if (locked) {
          merged = mergeSavedWithDefaults(loadStored(storageKey), w, h, hasVideo, hasPrimary, hasSecondary);
        } else if (hostLayoutRef.current) {
          const hostPx = denormalizeV1ToPixelPanels(
            hostLayoutRef.current.panels,
            w,
            h,
            hasVideo,
            hasPrimary,
            hasSecondary,
          );
          merged = mergeHostPixelsWithDefaults(hostPx, w, h, hasVideo, hasPrimary, hasSecondary);
        } else {
          merged = mergeSavedWithDefaults(loadStored(storageKey), w, h, hasVideo, hasPrimary, hasSecondary);
        }
        applyLayout(merged);
        layoutInitRef.current = true;
        return;
      }

      if (!userLockedRef.current && hostLayoutRef.current) {
        const hostPx = denormalizeV1ToPixelPanels(
          hostLayoutRef.current.panels,
          w,
          h,
          hasVideo,
          hasPrimary,
          hasSecondary,
        );
        const merged = mergeHostPixelsWithDefaults(hostPx, w, h, hasVideo, hasPrimary, hasSecondary);
        setGeoms((prev) => {
          const before = JSON.stringify(prev);
          const after = JSON.stringify(merged);
          if (before === after) return prev;
          saveStored(storageKey, merged);
          maxZRef.current = Math.max(1, ...Object.values(merged).map((g) => g?.z ?? 1));
          return merged;
        });
        return;
      }

      setGeoms((prev) => {
        const clamped = clampStored(prev, w, h, hasVideo, hasPrimary, hasSecondary);
        const before = JSON.stringify(prev);
        const after = JSON.stringify(clamped);
        if (before === after) return prev;
        saveStored(storageKey, clamped);
        return clamped;
      });
    };

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) run(cr.width, cr.height);
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    run(r.width, r.height);

    return () => ro.disconnect();
  }, [mounted, storageKey, hostLayoutSig, hasVideo, hasPrimary, hasSecondary, applyLayout]);

  const markUserCustomized = useCallback(() => {
    setUserLocked(storageKey);
    userLockedRef.current = true;
  }, [storageKey]);

  const publishLayout = useCallback(async () => {
    if (!eventId || !canPublishViewerLayout) return;
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width < 80 || height < 80) return;
    setPublishState("saving");
    const v1: ViewerCanvasLayoutV1 = {
      version: 1,
      panels: normalizePixelPanelsToV1(geoms, width, height),
      mobile: { defaultTab: publishMobileTab },
    };
    try {
      const res = await fetch(`/api/host/events/${eventId}/viewer-canvas-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v1),
      });
      if (!res.ok) {
        setPublishState("err");
        return;
      }
      setPublishState("ok");
      router.refresh();
      setTimeout(() => setPublishState("idle"), 2500);
    } catch {
      setPublishState("err");
    }
  }, [eventId, canPublishViewerLayout, geoms, publishMobileTab, router]);

  /** Raise stacking order on any mouse interaction with the window chrome (title, resize, edges). */
  const bringToFront = useCallback(
    (id: PanelId) => {
      setGeoms((prev) => {
        const g = prev[id];
        if (!g) return prev;
        maxZRef.current += 1;
        const next = { ...prev, [id]: { ...g, z: maxZRef.current } };
        saveStored(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  /** Live updates during drag/resize (no localStorage write). */
  const setGeomLive = useCallback((id: PanelId, patch: Partial<PanelGeom>) => {
    setGeoms((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  }, []);

  const resetLayout = useCallback(() => {
    clearUserLocked(storageKey);
    userLockedRef.current = false;
    try {
      localStorage.removeItem(`${LS_PREFIX}:${storageKey}`);
    } catch {
      /* */
    }
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 80) return;
    let merged: Stored;
    if (hostLayoutRef.current) {
      const hostPx = denormalizeV1ToPixelPanels(
        hostLayoutRef.current.panels,
        rect.width,
        rect.height,
        hasVideo,
        hasPrimary,
        hasSecondary,
      );
      merged = mergeHostPixelsWithDefaults(hostPx, rect.width, rect.height, hasVideo, hasPrimary, hasSecondary);
    } else {
      merged = mergeSavedWithDefaults({}, rect.width, rect.height, hasVideo, hasPrimary, hasSecondary);
    }
    applyLayout(merged);
    layoutInitRef.current = true;
  }, [storageKey, hasVideo, hasPrimary, hasSecondary, applyLayout]);

  const onDrag = useCallback(
    (id: PanelId) => (_e: unknown, d: { x: number; y: number }) => {
      setGeomLive(id, { x: d.x, y: d.y });
    },
    [setGeomLive],
  );

  const onDragStop = useCallback(
    (id: PanelId) => (_e: unknown, d: { x: number; y: number }) => {
      setCanvasPointerLock(false);
      markUserCustomized();
      setGeoms((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        maxZRef.current += 1;
        const next = { ...prev, [id]: { ...cur, x: d.x, y: d.y, z: maxZRef.current } };
        saveStored(storageKey, next);
        return next;
      });
    },
    [storageKey, markUserCustomized],
  );

  const onResize = useCallback(
    (id: PanelId) =>
      (
        _e: MouseEvent | TouchEvent,
        _dir: ResizeDirection,
        ref: HTMLElement,
        _delta: { width: number; height: number },
        pos: { x: number; y: number },
      ) => {
        setGeomLive(id, {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: pos.x,
          y: pos.y,
        });
      },
    [setGeomLive],
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
        setCanvasPointerLock(false);
        markUserCustomized();
        setGeoms((prev) => {
          const cur = prev[id];
          if (!cur) return prev;
          maxZRef.current += 1;
          const next = {
            ...prev,
            [id]: {
              ...cur,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              x: pos.x,
              y: pos.y,
              z: maxZRef.current,
            },
          };
          saveStored(storageKey, next);
          return next;
        });
      },
    [storageKey, markUserCustomized],
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
      <PanelRnd
        key={id}
        x={g.x}
        y={g.y}
        width={g.width}
        height={g.height}
        z={g.z}
        onDragStart={() => {
          setCanvasPointerLock(true);
        }}
        onDrag={onDrag(id)}
        onDragStop={onDragStop(id)}
        onResizeStart={() => {
          setCanvasPointerLock(true);
        }}
        onResize={onResize(id)}
        onResizeStop={onResizeStop(id)}
      >
        <div className="flex h-full min-h-0 flex-col">
          <PanelToolbar label={label} zoom={zm} onZoom={onZoom} onToolbarClick={() => bringToFront(id)} />
          <ZoomFrame zoom={zm} blockPointerEvents={canvasPointerLock}>
            {content}
          </ZoomFrame>
        </div>
      </PanelRnd>
    );
  };

  const setVideoZoom = useCallback((z: number) => setZoom((s) => ({ ...s, video: z })), []);
  const setPrimaryZoom = useCallback((z: number) => setZoom((s) => ({ ...s, primary: z })), []);
  const setSecondaryZoom = useCallback((z: number) => setZoom((s) => ({ ...s, secondary: z })), []);

  const footer = useMemo(
    () => (
      <div className={`shrink-0 space-y-2 text-xs text-zinc-600 ${compact ? "max-md:px-4 md:px-0" : ""}`}>
        <p>
          Click the toolbar (title or zoom) to raise a window. Drag the title to move; drag edges or corners to resize.{" "}
          <button type="button" onClick={resetLayout} className="text-violet-400 hover:underline">
            Reset layout
          </button>{" "}
          <span className="text-zinc-500">
            (Reset returns to the host default when the event has one; otherwise built-in defaults.)
          </span>
        </p>
        {canPublishViewerLayout && eventId ? (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-500/25 bg-amber-950/15 p-3 text-zinc-300">
            <label className="flex min-w-[10rem] flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
              Mobile first tab
              <select
                value={publishMobileTab}
                onChange={(e) => setPublishMobileTab(e.target.value as ViewerMobileTabId)}
                className="mt-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
              >
                {hasVideo ? <option value="video">{videoLabel.length > 24 ? "Video" : videoLabel}</option> : null}
                {hasPrimary ? <option value="primary">Game / tool</option> : null}
                {hasSecondary ? <option value="secondary">Public display</option> : null}
                {hasMobileChatTab ? <option value="chat">Chat</option> : null}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void publishLayout()}
              disabled={publishState === "saving"}
              className="rounded-lg bg-amber-600/90 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {publishState === "saving" ? "Saving…" : "Save layout for all viewers"}
            </button>
            {publishState === "ok" ? <span className="text-emerald-400">Saved.</span> : null}
            {publishState === "err" ? <span className="text-red-400">Save failed.</span> : null}
            <p className="w-full text-[11px] text-zinc-500">
              Publishes normalized window positions (desktop floating canvas). Mobile uses the tab you pick here, not raw
              multi-window geometry.
            </p>
          </div>
        ) : null}
      </div>
    ),
    [
      resetLayout,
      compact,
      canPublishViewerLayout,
      eventId,
      publishMobileTab,
      publishLayout,
      publishState,
      hasVideo,
      hasPrimary,
      hasSecondary,
      hasMobileChatTab,
      videoLabel,
    ],
  );

  if (!mounted) {
    return (
      <div
        className={`flex h-full min-h-[min(40vh,320px)] w-full min-w-0 flex-col gap-2 ${compact ? "max-md:pl-0" : ""}`}
      >
        <div className="min-h-[240px] w-full min-w-0 flex-1 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        {footer}
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-2 ${compact ? "max-md:px-0" : ""}`}>
      <div
        className={`shrink-0 text-xs ${compact ? "line-clamp-2 text-zinc-500 max-md:px-4 md:px-0" : "text-zinc-500"}`}
      >
        {compact ? (
          <>
            Drag titles to move; edges/corners resize. <span className="hidden sm:inline">Embed iframes pause while dragging.</span>
          </>
        ) : (
          <>
            Click the toolbar to focus a window. Drag the title to move; drag edges or corners to resize. While dragging
            or resizing, embeds are briefly non-interactive so the cursor is not captured by iframes.
          </>
        )}
      </div>
      <div
        ref={canvasRef}
        className={`relative h-full min-h-0 w-full min-w-0 flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_rgba(39,39,42,0.5),_transparent_60%),linear-gradient(180deg,_rgb(9,9,11)_0%,_rgb(24,24,27)_100%)] ring-1 ring-zinc-700/30 ${
          compact
            ? "rounded-none border-x-0 border-y border-zinc-800/90 md:rounded-r-2xl md:border-r"
            : "rounded-2xl border border-zinc-800/90"
        }`}
      >
        {hasVideo && renderPanel("video", videoLabel, video, zoom.video, setVideoZoom)}
        {hasPrimary && renderPanel("primary", primaryLabel, primary, zoom.primary, setPrimaryZoom)}
        {hasSecondary && renderPanel("secondary", secondaryLabel, secondary, zoom.secondary, setSecondaryZoom)}
      </div>
      {footer}
    </div>
  );
}
