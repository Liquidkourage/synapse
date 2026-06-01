/** Zoom Meeting SDK via CDN (bundled React 18 — avoids React 19 conflict in Synapse). */
export const ZOOM_SDK_VERSION = "6.0.2";

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
  eventSlug?: string;
  customerKey?: string;
  zak?: string | null;
};

type ZoomClientGlobal = {
  preLoadWasm: () => void;
  prepareWebSDK: () => void;
  init: (opts: Record<string, unknown>) => void;
  join: (opts: Record<string, unknown>) => void;
  leaveMeeting: (opts: Record<string, unknown>) => void;
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

let clientPromise: Promise<ZoomClientGlobal> | null = null;

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

/** Wait for cross-origin isolation (gallery view requires SharedArrayBuffer). */
export async function waitForCrossOriginIsolation(maxMs = 8000): Promise<boolean> {
  if (window.crossOriginIsolated) return true;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (window.crossOriginIsolated) return true;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
  return window.crossOriginIsolated;
}

export function leaveZoomMeeting(): Promise<void> {
  return loadZoomClientSdk().then(
    (ZoomMtg) =>
      new Promise((resolve) => {
        try {
          ZoomMtg.leaveMeeting({
            success: () => resolve(),
            error: () => resolve(),
          });
        } catch {
          resolve();
        }
      }),
  );
}

let joinPromise: Promise<void> | null = null;

/** Join via Client View — gallery when SharedArrayBuffer is available. */
export async function joinZoomClientView(
  payload: ZoomJoinPayload,
  leaveUrl: string,
): Promise<void> {
  if (joinPromise) return joinPromise;

  joinPromise = (async () => {
    await leaveZoomMeeting();
    const isolated = await waitForCrossOriginIsolation();
    const ZoomMtg = await loadZoomClientSdk();

    await new Promise<void>((resolve, reject) => {
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();
      ZoomMtg.init({
        leaveUrl,
        patchJsMedia: true,
        leaveOnPageUnload: true,
        enableHD: isolated,
        disableCORP: !isolated,
        defaultView: isolated ? "gallery" : "multiSpeaker",
        showMeetingHeader: false,
        disablePreview: true,
        success: () => {
          ZoomMtg.join({
            signature: payload.signature,
            sdkKey: payload.sdkKey,
            meetingNumber: payload.meetingNumber,
            passWord: payload.password,
            userName: payload.userName,
            userEmail: payload.userEmail,
            customerKey: payload.customerKey ?? "",
            zak: payload.zak ?? "",
            success: () => resolve(),
            error: (err: unknown) => reject(err),
          });
        },
        error: (err: unknown) => reject(err),
      });
    });
  })();

  try {
    await joinPromise;
  } catch (e) {
    joinPromise = null;
    throw e;
  }
}

export function resetZoomJoinState(): Promise<void> {
  joinPromise = null;
  return leaveZoomMeeting();
}
