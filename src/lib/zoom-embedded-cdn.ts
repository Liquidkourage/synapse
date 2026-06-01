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
  userId?: number;
  isHost?: boolean;
  bHost?: boolean;
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
  getSpotlightList?: (opts: Record<string, unknown>) => number[] | void;
  focusMode?: (opts: Record<string, unknown>) => void;
  inMeetingServiceListener?: (event: string, handler: (...args: unknown[]) => void) => void;
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
    ZoomMtg.getCurrentUser({
      success: (res: unknown) => {
        const self = parseCurrentUser(res);
        if (isHostUser(self) && typeof self?.userId === "number") {
          resolve(self.userId);
          return;
        }

        ZoomMtg.getAttendeeslist({
          success: (attendees: unknown) => {
            const list = parseAttendeeList(attendees);
            const host = list.find((u) => isHostUser(u));
            if (typeof host?.userId === "number") {
              resolve(host.userId);
              return;
            }
            if (isHostUser(self) && typeof self?.userId === "number") {
              resolve(self.userId);
              return;
            }
            resolve(null);
          },
          error: () => resolve(null),
        });
      },
      error: () => resolve(null),
    });
  });
}

function getSpotlightUserIds(ZoomMtg: ZoomClientGlobal): Promise<number[]> {
  return new Promise((resolve) => {
    if (!ZoomMtg.getSpotlightList) {
      resolve([]);
      return;
    }
    ZoomMtg.getSpotlightList({
      success: (res: unknown) => {
        resolve(Array.isArray(res) ? (res as number[]) : []);
      },
      error: () => resolve([]),
    });
  });
}

function spotlightUser(ZoomMtg: ZoomClientGlobal, userId: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operateSpotlight) {
      console.warn("[synapse-zoom] operateSpotlight unavailable");
      resolve(false);
      return;
    }
    ZoomMtg.operateSpotlight({
      userId,
      operate: "replace",
      success: () => resolve(true),
      error: (err: unknown) => {
        console.warn("[synapse-zoom] operateSpotlight failed", err);
        resolve(false);
      },
    });
  });
}

function enableFocusMode(ZoomMtg: ZoomClientGlobal): void {
  ZoomMtg.focusMode?.({
    enable: true,
    success: () => console.info("[synapse-zoom] focus mode enabled"),
    error: (err: unknown) => console.warn("[synapse-zoom] focus mode failed", err),
  });
}

/** Host spotlights themselves so every participant sees host as the main video. */
async function enforceHostPrimary(ZoomMtg: ZoomClientGlobal): Promise<void> {
  const hostId = await resolveHostUserId(ZoomMtg);
  if (hostId == null) {
    console.warn("[synapse-zoom] host userId not found — reconnect Zoom in Host Settings");
    return;
  }

  await spotlightUser(ZoomMtg, hostId);
  const spotlighted = await getSpotlightUserIds(ZoomMtg);
  if (!spotlighted.includes(hostId)) {
    console.warn("[synapse-zoom] host not in spotlight list after apply", { hostId, spotlighted });
    await spotlightUser(ZoomMtg, hostId);
  }
}

function setupHostPrimaryVideo(ZoomMtg: ZoomClientGlobal) {
  let hostUserId: number | null = null;
  let lastApplyMs = 0;

  const apply = () => {
    const now = Date.now();
    if (now - lastApplyMs < 900) return;
    lastApplyMs = now;
    void enforceHostPrimary(ZoomMtg).then(async () => {
      if (hostUserId == null) hostUserId = await resolveHostUserId(ZoomMtg);
    });
  };

  enableFocusMode(ZoomMtg);

  const retryDelays = [0, 600, 1500, 3000, 6000, 12_000, 20_000];
  for (const delay of retryDelays) {
    window.setTimeout(apply, delay);
  }

  const interval = window.setInterval(apply, 15_000);

  ZoomMtg.inMeetingServiceListener?.("onUserJoin", apply);
  ZoomMtg.inMeetingServiceListener?.("onUserUpdate", apply);
  ZoomMtg.inMeetingServiceListener?.("onMeetingStatus", (data: unknown) => {
    const status = (data as { status?: number })?.status;
    if (status === 2) apply();
  });

  /** When a guest becomes active speaker, speaker view puts them large — re-spotlight host. */
  ZoomMtg.inMeetingServiceListener?.("onActiveSpeaker", (data: unknown) => {
    const speakers = Array.isArray(data) ? (data as Array<{ userId?: number }>) : [];
    const activeId = speakers[0]?.userId;
    if (activeId == null) return;
    void resolveHostUserId(ZoomMtg).then((hostId) => {
      hostUserId = hostId;
      if (hostId != null && activeId !== hostId) apply();
    });
  });

  /** Full A/V ready is a more reliable hook than join() success alone. */
  ZoomMtg.inMeetingServiceListener?.("onJoinSpeed", (data: unknown) => {
    const level = (data as { level?: number })?.level;
    if (level === 17) apply();
  });

  window.addEventListener("beforeunload", () => window.clearInterval(interval));
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
        disablePictureInPicture: true,
        disableZoomLogo: true,
        videoHeader: false,
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
              if (isHost) setupHostPrimaryVideo(ZoomMtg);
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
