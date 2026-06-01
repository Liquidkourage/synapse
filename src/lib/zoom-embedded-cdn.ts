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
  role?: 0 | 1;
  zak?: string | null;
};

type ZoomCurrentUser = {
  userId?: number;
  isHost?: boolean;
};

type ZoomClientGlobal = {
  preLoadWasm: () => void;
  prepareWebSDK: () => void;
  init: (opts: Record<string, unknown>) => void;
  join: (opts: Record<string, unknown>) => void;
  leaveMeeting: (opts: Record<string, unknown>) => void;
  getCurrentUser: (opts: Record<string, unknown>) => void;
  getAttendeeslist: (opts: Record<string, unknown>) => void;
  operateSpotlight?: (opts: Record<string, unknown>) => void;
  inMeetingServiceListener?: (event: string, handler: () => void) => void;
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

function readUserId(res: unknown): number | null {
  const root = res as { result?: { currentUser?: ZoomCurrentUser } };
  const id = root.result?.currentUser?.userId;
  return typeof id === "number" ? id : null;
}

function readHostUserIdFromAttendees(res: unknown): number | null {
  const root = res as {
    result?: { attendeeList?: Array<{ userId?: number; isHost?: boolean; bHost?: boolean }> };
  };
  const list = root.result?.attendeeList;
  if (!Array.isArray(list)) return null;
  const host = list.find((u) => u.isHost || u.bHost);
  return typeof host?.userId === "number" ? host.userId : null;
}

function spotlightUser(ZoomMtg: ZoomClientGlobal, userId: number): Promise<void> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operateSpotlight) {
      resolve();
      return;
    }
    ZoomMtg.operateSpotlight({
      userId,
      operate: "add",
      success: () => resolve(),
      error: () => resolve(),
    });
  });
}

/** Host spotlights themselves so every participant sees host as the main video. */
function spotlightHost(ZoomMtg: ZoomClientGlobal): Promise<void> {
  return new Promise((resolve) => {
    ZoomMtg.getCurrentUser({
      success: async (res: unknown) => {
        const selfId = readUserId(res);
        if (selfId != null) {
          await spotlightUser(ZoomMtg, selfId);
          resolve();
          return;
        }
        ZoomMtg.getAttendeeslist({
          success: async (attendees: unknown) => {
            const hostId = readHostUserIdFromAttendees(attendees);
            if (hostId != null) await spotlightUser(ZoomMtg, hostId);
            resolve();
          },
          error: () => resolve(),
        });
      },
      error: () => resolve(),
    });
  });
}

function setupHostSpotlight(ZoomMtg: ZoomClientGlobal) {
  const apply = () => {
    void spotlightHost(ZoomMtg);
  };

  apply();
  window.setTimeout(apply, 800);
  window.setTimeout(apply, 2500);

  ZoomMtg.inMeetingServiceListener?.("onUserJoin", apply);
  ZoomMtg.inMeetingServiceListener?.("onUserUpdate", apply);
}

let joinPromise: Promise<void> | null = null;

/** Join via Client View — speaker view; host auto-spotlights for everyone. */
export async function joinZoomClientView(
  payload: ZoomJoinPayload,
  leaveUrl: string,
): Promise<void> {
  if (joinPromise) return joinPromise;

  const isHost = payload.role === 1;

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
        defaultView: "speaker",
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
            success: () => {
              if (isHost) setupHostSpotlight(ZoomMtg);
              resolve();
            },
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
