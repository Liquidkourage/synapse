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
    return "Could not create breakout rooms. Re-save the event with breakouts enabled, use Create/sync Zoom meeting, then rejoin the video panel.";
  }
  if (action === "open-rooms") {
    return "Could not open breakouts. Create rooms first, or use Zoom’s Breakout Rooms button in the meeting toolbar.";
  }
  return "Could not close breakouts. Use Zoom’s Breakout Rooms panel if the sidebar button fails.";
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
      reject(
        new Error(
          "Breakout rooms are not available in this Zoom embed. Rejoin the meeting after enabling breakouts on the event.",
        ),
      );
      return;
    }
    ZoomMtg.createBreakoutRoom({
      data: names,
      pattern: "manually",
      success: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });
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

export async function handleSynapseZoomBreakoutCommand(
  action: "create-rooms" | "open-rooms" | "close-rooms",
  names: string[],
): Promise<void> {
  const ZoomMtg = await loadZoomClientSdk();

  if (!(await isHostClient(ZoomMtg))) {
    fail("Only the meeting host can control breakout rooms. Join the Zoom panel as host (ZAK required).");
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
