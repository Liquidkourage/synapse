/** Zoom Meeting SDK via CDN (bundled React 18 — avoids React 19 conflict in Synapse). */
export const ZOOM_SDK_VERSION = "6.0.2";

/** Minimum panel size for Zoom gallery view (all cameras visible). */
export const ZOOM_GALLERY_MIN_WIDTH = 720;
export const ZOOM_GALLERY_MIN_HEIGHT = 411;

const version = ZOOM_SDK_VERSION;

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
};

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

export function supportsZoomGalleryView(width: number, height: number) {
  return width >= ZOOM_GALLERY_MIN_WIDTH && height >= ZOOM_GALLERY_MIN_HEIGHT;
}

export function galleryViewSizes(width: number, height: number) {
  return {
    default: {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    },
  };
}

export function updateZoomComponentVideoSize(
  client: ZoomEmbeddedClient,
  width: number,
  height: number,
) {
  client.updateVideoOptions?.({
    viewSizes: galleryViewSizes(width, height),
  });
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

  await client.init({
    zoomAppRoot: root,
    language: "en-US",
    patchJsMedia: true,
    disableCORP: !window.crossOriginIsolated,
    customize: {
      video: {
        isResizable: true,
        defaultViewType: "gallery",
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

  return client;
}
