/**
 * Zoom Meeting SDK breakout controls — runs inside the embed iframe after join.
 */

import {
  getActiveZoomMtg,
  getSynapseZoomJoinPayload,
  loadZoomClientSdk,
} from "@/lib/zoom-embedded-cdn";
import type { SynapseZoomBreakoutAck, SynapseZoomBreakoutStatus } from "@/lib/zoom-breakout-messages";
import { SYNAPSE_ZOOM_BO_CHANNEL } from "@/lib/zoom-breakout-messages";

type ZoomBoSdk = Awaited<ReturnType<typeof loadZoomClientSdk>>;

const BO_TIMEOUT_MS = 22_000;

/** Zoom BreakoutRoomAllocationPattern: manually = 2 (required when naming rooms). */
const BREAKOUT_PATTERN_MANUAL = 2;

function postStatus(status: SynapseZoomBreakoutStatus): void {
  if (window.parent === window) return;
  window.parent.postMessage(status, window.location.origin);
}

function postAck(action: string): void {
  if (window.parent === window) return;
  const ack: SynapseZoomBreakoutAck = {
    channel: SYNAPSE_ZOOM_BO_CHANNEL,
    type: "ack",
    action,
  };
  window.parent.postMessage(ack, window.location.origin);
}

function ok(message: string): void {
  postStatus({ channel: SYNAPSE_ZOOM_BO_CHANNEL, type: "status", ok: true, message });
}

function fail(message: string): void {
  postStatus({ channel: SYNAPSE_ZOOM_BO_CHANNEL, type: "status", ok: false, message });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Zoom SDK often passes plain objects, not Error instances. */
function formatZoomBreakoutError(err: unknown, action: string): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim();

  if (typeof err === "string" && err.trim()) return err.trim();

  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const code = o.errorCode ?? o.code ?? o.type;
    const msg =
      (typeof o.errorMessage === "string" && o.errorMessage) ||
      (typeof o.reason === "string" && o.reason) ||
      (typeof o.message === "string" && o.message) ||
      "";

    const codeStr = code != null ? String(code) : "";
    const combined = [codeStr, msg].filter(Boolean).join(": ").trim();
    if (combined) {
      const lower = combined.toLowerCase();
      if (lower.includes("invalid_operation") || lower.includes("has started") || lower.includes("3002")) {
        return "Breakout rooms are already open or in progress. Close them in Zoom first, then try again.";
      }
      if (lower.includes("not_host") || lower.includes("3003")) {
        return "You are not the meeting host in Zoom. Reconnect Zoom in host settings and rejoin with ZAK.";
      }
      if (lower.includes("pattern")) {
        return "Zoom rejected the breakout room setup (pattern). Try again after deploy, or create rooms with the Breakout Rooms button in the Zoom toolbar.";
      }
      if (lower.includes("invalid_parameters") || lower.includes("maximum")) {
        return combined;
      }
      return combined;
    }

    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      /* ignore */
    }
  }

  if (action === "create-rooms") {
    return "Could not create breakout rooms. Check the Zoom panel for a popup, or use Breakout Rooms in the Zoom toolbar.";
  }
  if (action === "open-rooms") {
    return "Could not open breakouts. Create rooms first, or use Zoom’s Breakout Rooms button in the meeting toolbar.";
  }
  return "Could not close breakouts. Use Zoom’s Breakout Rooms panel if the sidebar button fails.";
}

async function resolveZoomMtg(): Promise<ZoomBoSdk> {
  const active = getActiveZoomMtg();
  if (active) return active;
  return loadZoomClientSdk();
}

async function isHostInMeeting(ZoomMtg: ZoomBoSdk): Promise<boolean> {
  const join = getSynapseZoomJoinPayload();
  if (join?.role === 1) return true;

  return withTimeout(
    new Promise<boolean>((resolve) => {
      ZoomMtg.getCurrentUser({
        success: (res: unknown) => {
          const root = res as { result?: { currentUser?: { isHost?: boolean; bHost?: boolean } } };
          const u = root.result?.currentUser;
          resolve(!!(u?.isHost || u?.bHost));
        },
        error: () => resolve(false),
      });
    }),
    6000,
    "Host check timed out",
  ).catch(() => false);
}

function createBreakoutRoomsNamed(ZoomMtg: ZoomBoSdk, names: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.createBreakoutRoom) {
      reject(new Error("createBreakoutRoom is not available in this Zoom embed."));
      return;
    }
    ZoomMtg.createBreakoutRoom({
      data: names.length === 1 ? names[0]! : names,
      pattern: BREAKOUT_PATTERN_MANUAL,
      success: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });
}

async function createRoomsSequential(ZoomMtg: ZoomBoSdk, names: string[]): Promise<void> {
  for (const name of names) {
    await withTimeout(
      createBreakoutRoomsNamed(ZoomMtg, [name]),
      12_000,
      `Timed out creating room “${name}”. Check the Zoom panel for a dialog, or use Breakout Rooms in the toolbar.`,
    );
  }
}

async function createRooms(ZoomMtg: ZoomBoSdk, names: string[]): Promise<void> {
  try {
    await withTimeout(
      createBreakoutRoomsNamed(ZoomMtg, names),
      BO_TIMEOUT_MS,
      "Timed out creating breakout rooms.",
    );
  } catch (first) {
    if (names.length <= 1) throw first;
    console.warn("[zoom-breakout] batch create failed, trying one-by-one", first);
    await createRoomsSequential(ZoomMtg, names);
  }
}

function openRooms(ZoomMtg: ZoomBoSdk): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.openBreakoutRooms) {
      reject(new Error("openBreakoutRooms is not available in this Zoom SDK build."));
      return;
    }
    ZoomMtg.openBreakoutRooms({
      options: {
        isAutoJoinRoom: true,
        isBackToMainSessionEnabled: true,
        isTimerEnabled: false,
      },
      success: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });
}

function closeRooms(ZoomMtg: ZoomBoSdk): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.closeBreakoutRooms) {
      reject(new Error("closeBreakoutRooms is not available in this Zoom SDK build."));
      return;
    }
    ZoomMtg.closeBreakoutRooms({
      success: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });
}

/** Start host voice broadcast to all breakout rooms when the SDK exposes it (not in all web builds). */
function startBroadcastVoiceToBreakoutRooms(ZoomMtg: ZoomBoSdk): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (value: boolean) => resolve(value);
    const timer = window.setTimeout(() => finish(false), 4000);

    const mtg = ZoomMtg as Record<string, unknown>;
    const attempts: Array<{ fn: unknown; args: Record<string, unknown> }> = [
      {
        fn: mtg.broadcastVoiceToBreakoutRooms,
        args: {
          action: "start",
          success: () => {
            window.clearTimeout(timer);
            finish(true);
          },
          error: () => {
            window.clearTimeout(timer);
            finish(false);
          },
        },
      },
      {
        fn: mtg.broadcastVoiceToBO,
        args: {
          start: true,
          success: () => {
            window.clearTimeout(timer);
            finish(true);
          },
          error: () => {
            window.clearTimeout(timer);
            finish(false);
          },
        },
      },
    ];

    for (const { fn, args } of attempts) {
      if (typeof fn !== "function") continue;
      try {
        (fn as (opts: Record<string, unknown>) => void)(args);
        return;
      } catch {
        /* try next shape */
      }
    }
    window.clearTimeout(timer);
    finish(false);
  });
}

async function openRoomsAndBroadcastVoice(ZoomMtg: ZoomBoSdk): Promise<{ voiceStarted: boolean }> {
  await openRooms(ZoomMtg);
  await new Promise((r) => window.setTimeout(r, 800));
  const voiceStarted = await startBroadcastVoiceToBreakoutRooms(ZoomMtg);
  return { voiceStarted };
}

async function runBreakoutAction(
  action: "create-rooms" | "open-rooms" | "close-rooms",
  names: string[],
): Promise<void> {
  if (!getSynapseZoomJoinPayload() && !getActiveZoomMtg()) {
    fail("Zoom is still joining. Wait until the meeting video appears, then try again.");
    return;
  }

  const ZoomMtg = await resolveZoomMtg();

  if (!(await isHostInMeeting(ZoomMtg))) {
    fail("Only the meeting host can control breakout rooms. Rejoin as host (ZAK required in Zoom settings).");
    return;
  }

  if (action === "create-rooms") {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) {
      fail("Add team names on the event form first (one per line).");
      return;
    }
    await createRooms(ZoomMtg, list);
    ok(`Created ${list.length} breakout room(s): ${list.join(", ")}`);
    return;
  }

  if (action === "open-rooms") {
    const { voiceStarted } = await openRoomsAndBroadcastVoice(ZoomMtg);
    ok(
      voiceStarted
        ? "Breakout rooms are open — broadcast voice started. Keep your mic unmuted in Zoom."
        : "Breakout rooms are open — use Breakout Rooms → Broadcast → Broadcast voice if teams can't hear you.",
    );
    return;
  }

  await closeRooms(ZoomMtg);
  ok("Breakout rooms closed — everyone returns to the main session.");
}

export async function handleSynapseZoomBreakoutCommand(
  action: "create-rooms" | "open-rooms" | "close-rooms",
  names: string[],
): Promise<void> {
  postAck(action);
  try {
    await withTimeout(
      runBreakoutAction(action, names),
      BO_TIMEOUT_MS,
      "Breakout command timed out. Look at the Zoom panel for a breakout dialog, or use Breakout Rooms in the Zoom toolbar.",
    );
  } catch (e) {
    console.warn("[zoom-breakout]", action, e);
    fail(formatZoomBreakoutError(e, action));
  }
}

export function installSynapseZoomBreakoutMessageListener(): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const d = data as Record<string, unknown>;
    if (d.channel !== SYNAPSE_ZOOM_BO_CHANNEL) return;

    if (d.action === "create-rooms" && Array.isArray(d.names)) {
      void handleSynapseZoomBreakoutCommand("create-rooms", d.names as string[]);
    } else if (d.action === "open-rooms") {
      void handleSynapseZoomBreakoutCommand("open-rooms", []);
    } else if (d.action === "close-rooms") {
      void handleSynapseZoomBreakoutCommand("close-rooms", []);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
