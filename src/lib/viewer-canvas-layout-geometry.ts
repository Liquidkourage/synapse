/** Shared with client (ViewerCanvasLayout) and server — no zod. */

export const VIEWER_CANVAS_MARGIN = 10;
export const VIEWER_PANEL_MIN_W = 260;
export const VIEWER_PANEL_MIN_H = 140;
/** Matches per-panel zoom toolbar (CSS `zoom`). */
export const VIEWER_PANEL_ZOOM_MIN = 0.5;
export const VIEWER_PANEL_ZOOM_MAX = 1.75;

export type ViewerCanvasPanelId = "video" | "primary" | "secondary";

export type ViewerMobileTabId = "video" | "primary" | "secondary" | "chat";

export type NormalizedPanelGeom = {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  z: number;
  /** CSS zoom factor for embed content; omit or 1 for legacy layouts. */
  zoom?: number;
};

export type PanelZoomState = Record<ViewerCanvasPanelId, number>;

export function clampPanelZoom(z: number): number {
  if (!Number.isFinite(z)) return 1;
  const r = Math.round(z * 100) / 100;
  return Math.min(VIEWER_PANEL_ZOOM_MAX, Math.max(VIEWER_PANEL_ZOOM_MIN, r));
}

export function defaultPanelZoomState(): PanelZoomState {
  return { video: 1, primary: 1, secondary: 1 };
}

/** Apply optional zoom from stored layout for enabled panels only; missing entries stay at 100%. */
export function mergePanelZoomFromPartial(
  partial: Partial<Record<ViewerCanvasPanelId, number>> | null | undefined,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
): PanelZoomState {
  const d = defaultPanelZoomState();
  if (!partial) return d;
  if (hasVideo && partial.video != null) d.video = clampPanelZoom(partial.video);
  if (hasPrimary && partial.primary != null) d.primary = clampPanelZoom(partial.primary);
  if (hasSecondary && partial.secondary != null) d.secondary = clampPanelZoom(partial.secondary);
  return d;
}

export function panelZoomFromNormalizedPanels(
  panels: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>>,
): Partial<Record<ViewerCanvasPanelId, number>> {
  const out: Partial<Record<ViewerCanvasPanelId, number>> = {};
  for (const id of ["video", "primary", "secondary"] as const) {
    const z = panels[id]?.zoom;
    if (z != null && Number.isFinite(z)) out[id] = clampPanelZoom(z);
  }
  return out;
}

export type ViewerCanvasLayoutV1 = {
  version: 1;
  panels: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>>;
  mobile?: { defaultTab: ViewerMobileTabId };
};

type PixelStored = Partial<
  Record<ViewerCanvasPanelId, { x: number; y: number; width: number; height: number; z: number }>
>;

function innerSize(canvasW: number, canvasH: number, m = VIEWER_CANVAS_MARGIN) {
  return { innerW: Math.max(1, canvasW - m * 2), innerH: Math.max(1, canvasH - m * 2) };
}

export function normalizePixelPanelsToV1(
  geoms: PixelStored,
  canvasW: number,
  canvasH: number,
  margin = VIEWER_CANVAS_MARGIN,
  panelZoom?: Partial<Record<ViewerCanvasPanelId, number>>,
): Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>> {
  const { innerW, innerH } = innerSize(canvasW, canvasH, margin);
  const out: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>> = {};
  for (const id of ["video", "primary", "secondary"] as const) {
    const g = geoms[id];
    if (!g) continue;
    let nx = (g.x - margin) / innerW;
    let ny = (g.y - margin) / innerH;
    let nw = g.width / innerW;
    let nh = g.height / innerH;
    nx = Math.min(1, Math.max(0, nx));
    ny = Math.min(1, Math.max(0, ny));
    nw = Math.min(1, Math.max(0, nw));
    nh = Math.min(1, Math.max(0, nh));
    const zm = panelZoom?.[id];
    const zoom = zm != null && Number.isFinite(zm) ? clampPanelZoom(zm) : undefined;
    out[id] =
      zoom != null && zoom !== 1 ? { nx, ny, nw, nh, z: g.z, zoom } : { nx, ny, nw, nh, z: g.z };
  }
  return out;
}

/**
 * Collapse arbitrary z-values to 1..n while preserving stacking order.
 * Local UI bumps z on every interaction; the publish API caps z — remap before save.
 */
export function remapPublishedPanelZs(
  panels: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>>,
): Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>> {
  const ids = (["video", "primary", "secondary"] as const).filter((id) => panels[id]);
  if (ids.length === 0) return { ...panels };
  const sorted = [...ids].sort((a, b) => panels[a]!.z - panels[b]!.z);
  const out: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>> = { ...panels };
  sorted.forEach((id, i) => {
    const g = out[id];
    if (g) out[id] = { ...g, z: i + 1 };
  });
  return out;
}

function clampPixelGeom(
  g: { x: number; y: number; width: number; height: number; z: number },
  canvasW: number,
  canvasH: number,
  m = VIEWER_CANVAS_MARGIN,
): { x: number; y: number; width: number; height: number; z: number } {
  const maxW = Math.max(VIEWER_PANEL_MIN_W, canvasW - m * 2);
  const maxH = Math.max(VIEWER_PANEL_MIN_H, canvasH - m * 2);
  let { x, y, width, height, z } = g;
  width = Math.min(Math.max(VIEWER_PANEL_MIN_W, width), maxW);
  height = Math.min(Math.max(VIEWER_PANEL_MIN_H, height), maxH);
  x = Math.max(m, Math.min(x, canvasW - width - m));
  y = Math.max(m, Math.min(y, canvasH - height - m));
  return { x, y, width, height, z };
}

export function denormalizeV1ToPixelPanels(
  panels: Partial<Record<ViewerCanvasPanelId, NormalizedPanelGeom>>,
  canvasW: number,
  canvasH: number,
  hasVideo: boolean,
  hasPrimary: boolean,
  hasSecondary: boolean,
  margin = VIEWER_CANVAS_MARGIN,
): PixelStored {
  const { innerW, innerH } = innerSize(canvasW, canvasH, margin);
  const out: PixelStored = {};

  const mapOne = (id: ViewerCanvasPanelId, enabled: boolean) => {
    if (!enabled) return;
    const n = panels[id];
    if (!n) return;
    const g = {
      x: margin + n.nx * innerW,
      y: margin + n.ny * innerH,
      width: n.nw * innerW,
      height: n.nh * innerH,
      z: n.z,
    };
    out[id] = clampPixelGeom(g, canvasW, canvasH, margin);
  };

  mapOne("video", hasVideo);
  mapOne("primary", hasPrimary);
  mapOne("secondary", hasSecondary);
  return out;
}
