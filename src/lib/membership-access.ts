import type { Session } from "next-auth";
import type { EventStatus } from "@/generated/prisma";
import { canParticipateInLive, isEventStaff } from "@/lib/membership";

export type GameEmbedAccess = {
  show: boolean;
  preview: boolean;
  /** True when embed URL may be sent to the client. */
  exposeEmbedUrl: boolean;
  membershipBlocked: boolean;
};

/**
 * LIVE game/tool embeds: time window + membership entitlement (when gating on).
 * Staff may preview before LIVE. Public discovery pages stay reachable; URLs are withheld.
 */
export async function getGameEmbedAccess(
  event: { hostId: string; producerId: string | null },
  eff: EventStatus,
  session: Session | null,
): Promise<GameEmbedAccess> {
  const staff = isEventStaff(session, event);

  if (eff !== "LIVE" && !staff) {
    return { show: false, preview: false, exposeEmbedUrl: false, membershipBlocked: false };
  }

  if (eff !== "LIVE" && staff) {
    return { show: true, preview: true, exposeEmbedUrl: true, membershipBlocked: false };
  }

  // LIVE
  const ent = await canParticipateInLive(session, event);
  if (!ent.entitled) {
    return { show: false, preview: false, exposeEmbedUrl: false, membershipBlocked: ent.gatingEnabled };
  }

  return {
    show: true,
    preview: false,
    exposeEmbedUrl: true,
    membershipBlocked: false,
  };
}
