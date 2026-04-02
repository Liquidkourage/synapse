import type { Session } from "next-auth";

/**
 * When `broadcastHostOnlyJoin` is set, only the event host (and ops roles below) may see the
 * interactive video embed on Synapse. Others see a short notice instead.
 *
 * Note: Determined users could still open the raw room URL if they obtain it — use Daily private
 * rooms + meeting tokens for stronger enforcement.
 */
export function canViewBroadcastEmbed(
  event: { hostId: string; producerId: string | null; broadcastHostOnlyJoin: boolean },
  session: Session | null,
): boolean {
  if (!event.broadcastHostOnlyJoin) return true;
  const uid = session?.user?.id;
  if (!uid) return false;
  if (uid === event.hostId) return true;
  const role = session?.user?.role;
  if (role === "ADMIN") return true;
  if (role === "PRODUCER" && event.producerId === uid) return true;
  return false;
}
