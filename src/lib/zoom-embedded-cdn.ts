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

type ZoomUser = {
  userId?: number | string;
  isHost?: boolean;
  bHost?: boolean;
};

type ZoomI18n = {
  load: (lang: string) => void;
  onLoad: (callback: () => void) => void;
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
  operatePin?: (opts: Record<string, unknown>) => void;
  inMeetingServiceListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  i18n?: ZoomI18n;
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

function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseCurrentUser(res: unknown): ZoomUser | null {
  const root = res as { result?: { currentUser?: ZoomUser }; currentUser?: ZoomUser };
  return root.result?.currentUser ?? root.currentUser ?? null;
}

function parseAttendeeList(res: unknown): ZoomUser[] {
  const root = res as { result?: { attendeeList?: ZoomUser[] }; attendeeList?: ZoomUser[] };
  return root.attendeeList ?? root.result?.attendeeList ?? [];
}

function isHostUser(user: ZoomUser | null | undefined): boolean {
  return !!(user?.isHost || user?.bHost);
}

function resolveHostUserId(ZoomMtg: ZoomClientGlobal): Promise<number | null> {
  return new Promise((resolve) => {
    ZoomMtg.getAttendeeslist({
      success: (attendees: unknown) => {
        const list = parseAttendeeList(attendees);
        const host = list.find((u) => isHostUser(u));
        const hostId = normalizeUserId(host?.userId);
        if (hostId != null) {
          resolve(hostId);
          return;
        }
        ZoomMtg.getCurrentUser({
          success: (res: unknown) => {
            const self = parseCurrentUser(res);
            resolve(isHostUser(self) ? normalizeUserId(self?.userId) : null);
          },
          error: () => resolve(null),
        });
      },
      error: () => resolve(null),
    });
  });
}

function isHostClient(ZoomMtg: ZoomClientGlobal, payload: ZoomJoinPayload): Promise<boolean> {
  if (payload.role === 1) return Promise.resolve(true);
  return new Promise((resolve) => {
    ZoomMtg.getCurrentUser({
      success: (res: unknown) => resolve(isHostUser(parseCurrentUser(res))),
      error: () => resolve(false),
    });
  });
}

/** Pin is per-device — every client pins the host so host is large and guest is small. */
function pinHostOnThisDevice(ZoomMtg: ZoomClientGlobal, hostId: number): Promise<void> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operatePin) {
      resolve();
      return;
    }
    ZoomMtg.operatePin({
      userId: hostId,
      operate: "replace",
      success: () => resolve(),
      error: () => resolve(),
    });
  });
}

function spotlightHostForMeeting(ZoomMtg: ZoomClientGlobal, hostId: number): Promise<void> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operateSpotlight) {
      resolve();
      return;
    }
    ZoomMtg.operateSpotlight({
      userId: hostId,
      operate: "replace",
      success: () => resolve(),
      error: () => resolve(),
    });
  });
}

/**
 * Host large, everyone else small.
 * With 2 people, Zoom spotlight is unreliable — pin the host on every client instead.
 */
async function enforceHostLargeLayout(ZoomMtg: ZoomClientGlobal, payload: ZoomJoinPayload): Promise<void> {
  const hostId = await resolveHostUserId(ZoomMtg);
  if (hostId == null) return;

  await pinHostOnThisDevice(ZoomMtg, hostId);

  if (await isHostClient(ZoomMtg, payload)) {
    await spotlightHostForMeeting(ZoomMtg, hostId);
  }
}

function setupHostLargeLayout(ZoomMtg: ZoomClientGlobal, payload: ZoomJoinPayload) {
  let lastApplyMs = 0;

  const apply = (urgent = false) => {
    const now = Date.now();
    if (!urgent && now - lastApplyMs < 600) return;
    lastApplyMs = now;
    void enforceHostLargeLayout(ZoomMtg, payload);
  };

  for (const delay of [0, 300, 800, 1500, 3000, 6000, 10_000, 18_000]) {
    window.setTimeout(() => apply(false), delay);
  }

  const interval = window.setInterval(() => apply(false), 3_000);
  window.setTimeout(() => window.clearInterval(interval), 180_000);

  ZoomMtg.inMeetingServiceListener?.("onUserJoin", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onUserUpdate", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onActiveSpeaker", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onVideoOrder", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onJoinSpeed", (data: unknown) => {
    if ((data as { level?: number })?.level === 17) apply(true);
  });
}

function whenZoomReady(ZoomMtg: ZoomClientGlobal, run: () => void): void {
  if (ZoomMtg.i18n?.load && ZoomMtg.i18n?.onLoad) {
    ZoomMtg.i18n.load("en-US");
    ZoomMtg.i18n.onLoad(run);
    return;
  }
  run();
}

let joinPromise: Promise<void> | null = null;

/** Join — every participant pins host video large on their own screen. */
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
      whenZoomReady(ZoomMtg, () => {
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
          disablePictureInPicture: false,
          disableZoomLogo: true,
          videoHeader: true,
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
                setupHostLargeLayout(ZoomMtg, payload);
                resolve();
              },
              error: (err: unknown) => reject(err),
            });
          },
          error: (err: unknown) => reject(err),
        });
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
