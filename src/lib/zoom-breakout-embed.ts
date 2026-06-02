/**
 * Zoom Meeting SDK breakout controls — runs inside the embed iframe after join.
 */

import { loadZoomClientSdk } from "@/lib/zoom-embedded-cdn";
import type { SynapseZoomBreakoutStatus } from "@/lib/zoom-breakout-messages";
import { SYNAPSE_ZOOM_BO_CHANNEL } from "@/lib/zoom-breakout-messages";

type ZoomBoSdk = Awaited<ReturnType<typeof loadZoomClientSdk>>;

function postStatus(status: SynapseZoomBreakoutStatus): void {
  if (window.parent === window) return;
  window.parent.postMessage(status, window.location.origin);
}

function ok(message: string): void {
  postStatus({ channel: SYNAPSE_ZOOM_BO_CHANNEL, type: "status", ok: true, message });
}

function fail(message: string): void {
  postStatus({ channel: SYNAPSE_ZOOM_BO_CHANNEL, type: "status", ok: false, message });
}

function isHostClient(ZoomMtg: ZoomBoSdk): Promise<boolean> {
  return new Promise((resolve) => {
    ZoomMtg.getCurrentUser({
      success: (res: unknown) => {
        const root = res as { result?: { currentUser?: { isHost?: boolean; bHost?: boolean } } };
        const u = root.result?.currentUser;
        resolve(!!(u?.isHost || u?.bHost));
      },
      error: () => resolve(false),
    });
  });
}

function createRooms(ZoomMtg: ZoomBoSdk, names: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.createBreakoutRoom) {
      reject(new Error("Breakout rooms are not available in this Zoom SDK build."));
      return;
    }
    const data = names.length > 0 ? names : 2;
    ZoomMtg.createBreakoutRoom({
      data,
      pattern: "manually",
      success: () => resolve(),
      error: (err: unknown) => reject(err ?? new Error("createBreakoutRoom failed")),
    });
  });
}

function openRooms(ZoomMtg: ZoomBoSdk): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.openBreakoutRooms) {
      reject(new Error("openBreakoutRooms is not available."));
      return;
    }
    ZoomMtg.openBreakoutRooms({
      options: {
        isAutoJoinRoom: true,
        isBackToMainSessionEnabled: true,
        isTimerEnabled: false,
      },
      success: () => resolve(),
      error: (err: unknown) => reject(err ?? new Error("openBreakoutRooms failed")),
    });
  });
}

function closeRooms(ZoomMtg: ZoomBoSdk): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ZoomMtg.closeBreakoutRooms) {
      reject(new Error("closeBreakoutRooms is not available."));
      return;
    }
    ZoomMtg.closeBreakoutRooms({
      success: () => resolve(),
      error: (err: unknown) => reject(err ?? new Error("closeBreakoutRooms failed")),
    });
  });
}

export async function handleSynapseZoomBreakoutCommand(
  action: "create-rooms" | "open-rooms" | "close-rooms",
  names: string[],
): Promise<void> {
  const ZoomMtg = await loadZoomClientSdk();

  if (!(await isHostClient(ZoomMtg))) {
    fail("Only the meeting host can control breakout rooms.");
    return;
  }

  try {
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
      await openRooms(ZoomMtg);
      ok("Breakout rooms are open — participants will join their rooms.");
      return;
    }
    await closeRooms(ZoomMtg);
    ok("Breakout rooms closed — everyone returns to the main session.");
  } catch (e) {
    fail(e instanceof Error ? e.message : "Breakout action failed");
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
