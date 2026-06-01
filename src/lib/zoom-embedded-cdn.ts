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
  getSpotlightList?: (opts: Record<string, unknown>) => number[] | void;
  focusMode?: (opts: Record<string, unknown>) => void;
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
            if (isHostUser(self)) {
              resolve(normalizeUserId(self?.userId));
              return;
            }
            resolve(null);
          },
          error: () => resolve(null),
        });
      },
      error: () => {
        ZoomMtg.getCurrentUser({
          success: (res: unknown) => {
            const self = parseCurrentUser(res);
            resolve(isHostUser(self) ? normalizeUserId(self?.userId) : null);
          },
          error: () => resolve(null),
        });
      },
    });
  });
}

function parseSpotlightIds(res: unknown): number[] {
  if (Array.isArray(res)) {
    return res.map(normalizeUserId).filter((id): id is number => id != null);
  }
  const nested = (res as { result?: unknown })?.result;
  if (Array.isArray(nested)) {
    return nested.map(normalizeUserId).filter((id): id is number => id != null);
  }
  return [];
}

function getSpotlightUserIds(ZoomMtg: ZoomClientGlobal): Promise<number[]> {
  return new Promise((resolve) => {
    if (!ZoomMtg.getSpotlightList) {
      resolve([]);
      return;
    }
    try {
      const direct = ZoomMtg.getSpotlightList({});
      if (Array.isArray(direct)) {
        resolve(parseSpotlightIds(direct));
        return;
      }
    } catch {
      /* callback path below */
    }
    ZoomMtg.getSpotlightList({
      success: (res: unknown) => resolve(parseSpotlightIds(res)),
      error: () => resolve([]),
    });
  });
}

function spotlightUser(
  ZoomMtg: ZoomClientGlobal,
  userId: number,
  operate: "add" | "replace",
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operateSpotlight) {
      resolve(false);
      return;
    }
    ZoomMtg.operateSpotlight({
      userId,
      operate,
      success: () => resolve(true),
      error: (err: unknown) => {
        console.warn("[synapse-zoom] operateSpotlight failed", operate, err);
        resolve(false);
      },
    });
  });
}

/** Pin is local to this client — host pins self so they see their own video large. */
function pinUser(ZoomMtg: ZoomClientGlobal, userId: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ZoomMtg.operatePin) {
      resolve(false);
      return;
    }
    ZoomMtg.operatePin({
      userId,
      operate: "replace",
      success: () => resolve(true),
      error: (err: unknown) => {
        console.warn("[synapse-zoom] operatePin failed", err);
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

/** Spotlight for everyone + pin for host's own screen (2-person meetings use active speaker otherwise). */
async function enforceHostPrimary(ZoomMtg: ZoomClientGlobal): Promise<void> {
  const hostId = await resolveHostUserId(ZoomMtg);
  if (hostId == null) {
    console.warn("[synapse-zoom] host userId not found");
    return;
  }

  await spotlightUser(ZoomMtg, hostId, "add");
  await spotlightUser(ZoomMtg, hostId, "replace");
  await pinUser(ZoomMtg, hostId);

  const spotlighted = await getSpotlightUserIds(ZoomMtg);
  if (!spotlighted.includes(hostId)) {
    console.warn("[synapse-zoom] host not spotlighted after apply", { hostId, spotlighted });
    await spotlightUser(ZoomMtg, hostId, "add");
  }
}

function setupHostPrimaryVideo(ZoomMtg: ZoomClientGlobal) {
  let hostUserId: number | null = null;
  let lastRoutineApplyMs = 0;

  const apply = (urgent = false) => {
    const now = Date.now();
    if (!urgent && now - lastRoutineApplyMs < 800) return;
    lastRoutineApplyMs = now;
    void enforceHostPrimary(ZoomMtg).then(async () => {
      if (hostUserId == null) hostUserId = await resolveHostUserId(ZoomMtg);
    });
  };

  enableFocusMode(ZoomMtg);

  const retryDelays = [0, 400, 1000, 2000, 4000, 8000, 15_000, 25_000];
  for (const delay of retryDelays) {
    window.setTimeout(() => apply(false), delay);
  }

  const fastInterval = window.setInterval(() => apply(false), 4_000);
  window.setTimeout(() => window.clearInterval(fastInterval), 120_000);
  const slowInterval = window.setInterval(() => apply(false), 20_000);

  ZoomMtg.inMeetingServiceListener?.("onUserJoin", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onUserUpdate", () => apply(true));
  ZoomMtg.inMeetingServiceListener?.("onMeetingStatus", (data: unknown) => {
    const status = (data as { status?: number })?.status;
    if (status === 2) apply(true);
  });

  ZoomMtg.inMeetingServiceListener?.("onActiveSpeaker", (data: unknown) => {
    const speakers = Array.isArray(data) ? (data as Array<{ userId?: number | string }>) : [];
    const activeId = normalizeUserId(speakers[0]?.userId);
    if (activeId == null) return;
    void resolveHostUserId(ZoomMtg).then((hostId) => {
      hostUserId = hostId;
      if (hostId != null && activeId !== hostId) apply(true);
    });
  });

  ZoomMtg.inMeetingServiceListener?.("onVideoOrder", (data: unknown) => {
    const order = data as {
      speakerActiveCurrent?: Array<number | string>;
      singleActiveCurrent?: Array<number | string>;
      multiSpeakerMainCurrent?: Array<number | string>;
    };
    void resolveHostUserId(ZoomMtg).then((hostId) => {
      if (hostId == null) return;
      hostUserId = hostId;
      const main =
        normalizeUserId(order.speakerActiveCurrent?.[0]) ??
        normalizeUserId(order.singleActiveCurrent?.[0]) ??
        normalizeUserId(order.multiSpeakerMainCurrent?.[0]);
      if (main != null && main !== hostId) apply(true);
    });
  });

  ZoomMtg.inMeetingServiceListener?.("onJoinSpeed", (data: unknown) => {
    const level = (data as { level?: number })?.level;
    if (level === 17) apply(true);
  });

  window.addEventListener("beforeunload", () => window.clearInterval(slowInterval));
}

function whenZoomReady(ZoomMtg: ZoomClientGlobal, run: () => void): void {
  if (ZoomMtg.i18n?.load && ZoomMtg.i18n?.onLoad) {
    ZoomMtg.i18n.load("en-US");
    ZoomMtg.i18n.onLoad(run);
    return;
  }
  run();
}

function shouldRunHostLayout(ZoomMtg: ZoomClientGlobal, payload: ZoomJoinPayload): Promise<boolean> {
  if (payload.role === 1) return Promise.resolve(true);
  return new Promise((resolve) => {
    ZoomMtg.getCurrentUser({
      success: (res: unknown) => resolve(isHostUser(parseCurrentUser(res))),
      error: () => resolve(false),
    });
  });
}

let joinPromise: Promise<void> | null = null;

/** Join via Client View — host spotlights + pins self; focus mode for guests. */
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
                void shouldRunHostLayout(ZoomMtg, payload).then((runHostLayout) => {
                  if (runHostLayout) setupHostPrimaryVideo(ZoomMtg);
                });
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
