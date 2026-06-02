/** postMessage protocol between Synapse host UI and the Zoom embed iframe. */

export const SYNAPSE_ZOOM_BO_CHANNEL = "synapse-zoom-breakout" as const;

export type SynapseZoomBreakoutCommand =
  | { channel: typeof SYNAPSE_ZOOM_BO_CHANNEL; action: "create-rooms"; names: string[] }
  | { channel: typeof SYNAPSE_ZOOM_BO_CHANNEL; action: "open-rooms" }
  | { channel: typeof SYNAPSE_ZOOM_BO_CHANNEL; action: "close-rooms" };

export type SynapseZoomBreakoutStatus = {
  channel: typeof SYNAPSE_ZOOM_BO_CHANNEL;
  type: "status";
  ok: boolean;
  message: string;
};

export function isSynapseZoomBreakoutCommand(data: unknown): data is SynapseZoomBreakoutCommand {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.channel !== SYNAPSE_ZOOM_BO_CHANNEL) return false;
  if (d.action === "create-rooms") return Array.isArray(d.names);
  return d.action === "open-rooms" || d.action === "close-rooms";
}

export function isSynapseZoomBreakoutStatus(data: unknown): data is SynapseZoomBreakoutStatus {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.channel === SYNAPSE_ZOOM_BO_CHANNEL && d.type === "status";
}
