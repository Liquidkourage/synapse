/** Zoom Meeting SDK Component View via CDN (bundled React 18 — avoids React 19 conflict). */
export const ZOOM_EMBEDDED_SDK_VERSION = "6.0.2";

const version = ZOOM_EMBEDDED_SDK_VERSION;

const SCRIPT_URLS = [
  `https://source.zoom.us/${version}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/redux.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/redux-thunk.min.js`,
  `https://source.zoom.us/${version}/lib/vendor/lodash.min.js`,
  `https://source.zoom.us/${version}/zoom-meeting-embedded-${version}.min.js`,
] as const;

let loadPromise: Promise<ZoomEmbeddedGlobal> | null = null;

export type ZoomEmbeddedClient = {
  init: (opts: {
    zoomAppRoot: HTMLElement;
    language?: string;
    patchJsMedia?: boolean;
  }) => Promise<void>;
  join: (opts: {
    signature: string;
    sdkKey: string;
    meetingNumber: string;
    password: string;
    userName: string;
    userEmail?: string;
    tk?: string;
    zak?: string;
  }) => Promise<void>;
};

type ZoomEmbeddedGlobal = {
  createClient: () => ZoomEmbeddedClient;
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

export function loadZoomEmbeddedSdk(): Promise<ZoomEmbeddedGlobal> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    for (const src of SCRIPT_URLS) {
      await loadScript(src);
    }
    const sdk = (window as Window & { ZoomMtgEmbedded?: ZoomEmbeddedGlobal }).ZoomMtgEmbedded;
    if (!sdk?.createClient) {
      throw new Error("Zoom Meeting SDK did not load");
    }
    return sdk;
  })();

  return loadPromise;
}
