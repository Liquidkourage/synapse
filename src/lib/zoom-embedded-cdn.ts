/** Zoom Meeting SDK via CDN (bundled React 18 — avoids React 19 conflict in Synapse). */
export const ZOOM_SDK_VERSION = "6.0.2";

const version = ZOOM_SDK_VERSION;

/** Component-view toolbar + chrome below the video canvas. */
export const ZOOM_TOOLBAR_RESERVE_PX = 88;

const VENDOR_SCRIPTS = [
  `https://source.zoom.us/${version}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/redux.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/redux-thunk.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/lodash.min.js`,
] as const;

export type ZoomJoinPayload = {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  zak?: string | null;
};

type ZoomEmbeddedGlobal = {
  createClient: () => ZoomEmbeddedClient;
};

export type ZoomEmbeddedClient = {
  init: (opts: Record<string, unknown>) => Promise<void>;
  join: (opts: Record<string, unknown>) => Promise<void>;
  updateVideoOptions?: (opts: Record<string, unknown>) => void;
  setViewType?: (viewType: string) => unknown;
  on?: (event: string, handler: () => void) => void;
};

const GALLERY_MIN_WIDTH = 720;
const GALLERY_MIN_HEIGHT = 411;

type ZoomClientGlobal = {
  preLoadWasm: () => void;
  prepareWebSDK: () => void;
  init: (opts: Record<string, unknown>) => void;
  join: (opts: Record<string, unknown>) => void;
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function loadVendorScripts() {
  for (const src of VENDOR_SCRIPTS) {
    await loadScript(src);
  }
}

let embeddedPromise: Promise<ZoomEmbeddedGlobal> | null = null;

/** Component View — embeddable panel (iframe on event stage). */
export function loadZoomEmbeddedSdk(): Promise<ZoomEmbeddedGlobal> {
  if (!embeddedPromise) {
    embeddedPromise = (async () => {
      await loadVendorScripts();
      await loadScript(`https://source.zoom.us/${version}/zoom-meeting-embedded-${version}.min.js`);
      const sdk = (window as Window & { ZoomMtgEmbedded?: ZoomEmbeddedGlobal }).ZoomMtgEmbedded;
      if (!sdk?.createClient) throw new Error("Zoom embedded SDK did not load");
      return sdk;
    })();
  }
  return embeddedPromise;
}

let clientPromise: Promise<ZoomClientGlobal> | null = null;

/** Client View — full Zoom UI (direct /embed URL only; not linked from stage). */
export function loadZoomClientSdk(): Promise<ZoomClientGlobal> {
  if (!clientPromise) {
    clientPromise = (async () => {
      await loadVendorScripts();
      await loadScript(`https://source.zoom.us/${version}/zoom-meeting-${version}.min.js`);
      const sdk = (window as Window & { ZoomMtg?: ZoomClientGlobal }).ZoomMtg;
      if (!sdk?.init) throw new Error("Zoom client SDK did not load");
      return sdk;
    })();
  }
  return clientPromise;
}

/** Video canvas size — excludes Zoom's bottom toolbar so tiles fill the visible area. */
export function measureZoomVideoArea(
  width: number,
  height: number,
  toolbarReserve = ZOOM_TOOLBAR_RESERVE_PX,
) {
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height - toolbarReserve)),
  };
}

export function galleryViewSizes(width: number, height: number) {
  const area = measureZoomVideoArea(width, height);
  return { default: area };
}

function applyGalleryIfReady(client: ZoomEmbeddedClient, width: number, height: number) {
  const area = measureZoomVideoArea(width, height);
  client.updateVideoOptions?.({
    viewSizes: galleryViewSizes(width, height),
  });
  if (
    window.crossOriginIsolated &&
    area.width >= GALLERY_MIN_WIDTH &&
    area.height >= GALLERY_MIN_HEIGHT
  ) {
    client.setViewType?.("gallery");
  } else {
    client.setViewType?.("speaker");
  }
}

export function updateZoomComponentVideoSize(
  client: ZoomEmbeddedClient,
  width: number,
  height: number,
) {
  applyGalleryIfReady(client, width, height);
}

export function attachZoomVideoResizeListeners(
  client: ZoomEmbeddedClient,
  getSize: () => { width: number; height: number },
) {
  const sync = () => {
    const { width, height } = getSize();
    if (width < 1 || height < 1) return;
    applyGalleryIfReady(client, width, height);
  };

  client.on?.("user-added", sync);
  client.on?.("user-updated", sync);
  client.on?.("user-removed", sync);

  return sync;
}

export function joinZoomClientView(payload: ZoomJoinPayload, leaveUrl: string): Promise<void> {
  return loadZoomClientSdk().then(
    (ZoomMtg) =>
      new Promise<void>((resolve, reject) => {
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();
        ZoomMtg.init({
          leaveUrl,
          patchJsMedia: true,
          success: () => {
            ZoomMtg.join({
              signature: payload.signature,
              sdkKey: payload.sdkKey,
              meetingNumber: payload.meetingNumber,
              passWord: payload.password,
              userName: payload.userName,
              userEmail: payload.userEmail,
              zak: payload.zak ?? "",
              success: () => resolve(),
              error: (err: unknown) => reject(err),
            });
          },
          error: (err: unknown) => reject(err),
        });
      }),
  );
}

export async function joinZoomComponentView(
  root: HTMLElement,
  payload: ZoomJoinPayload,
): Promise<ZoomEmbeddedClient> {
  const ZoomMtgEmbedded = await loadZoomEmbeddedSdk();
  const client = ZoomMtgEmbedded.createClient();
  const { width, height } = root.getBoundingClientRect();
  const isolated = window.crossOriginIsolated;

  await client.init({
    zoomAppRoot: root,
    language: "en-US",
    patchJsMedia: true,
    enableHD: isolated,
    disableCORP: !isolated,
    customize: {
      meetingInfo: [],
      video: {
        isResizable: true,
        defaultViewType: isolated ? "gallery" : "speaker",
        viewSizes: galleryViewSizes(width, height),
      },
    },
  });

  await client.join({
    signature: payload.signature,
    sdkKey: payload.sdkKey,
    meetingNumber: payload.meetingNumber,
    password: payload.password,
    userName: payload.userName,
    userEmail: payload.userEmail,
    tk: "",
    zak: payload.zak ?? "",
  });

  applyGalleryIfReady(client, width, height);
  return client;
}
