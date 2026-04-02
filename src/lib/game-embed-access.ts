import type { Session } from "next-auth";
import type { EventStatus } from "@/generated/prisma";

/**
 * Game/tool iframe (TrivNow, etc.): public sees it only while the event is effectively LIVE.
 * Host, assigned producer, and admin can preview the embed before the live window.
 */
export function getGameEmbedVisibility(
  event: { hostId: string; producerId: string | null },
  eff: EventStatus,
  session: Session | null,
): { show: boolean; preview: boolean } {
  if (eff === "LIVE") {
    return { show: true, preview: false };
  }
  const uid = session?.user?.id;
  const role = session?.user?.role;
  const staff =
    !!uid &&
    (uid === event.hostId ||
      role === "ADMIN" ||
      (role === "PRODUCER" && event.producerId === uid));
  if (staff) {
    return { show: true, preview: true };
  }
  return { show: false, preview: false };
}
