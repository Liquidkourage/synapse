import { auth } from "@/auth";
import { getHostZoomStatusForUser } from "@/lib/host-zoom-status";
import { isHostOrAbove } from "@/lib/rbac";
import { getSynapseVideoServerHints } from "@/lib/synapse-video";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getHostNewEventPageContext() {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) redirect("/login");

  const videoHints = getSynapseVideoServerHints();
  const zoomStatus = await getHostZoomStatusForUser(session.user.id);

  let hostOptions: { id: string; label: string }[] | undefined;
  if (session.user.role === "ADMIN" || session.user.role === "PRODUCER") {
    const hosts = await prisma.user.findMany({
      where: { role: { in: ["HOST", "PRODUCER", "ADMIN"] } },
      orderBy: { email: "asc" },
    });
    hostOptions = hosts.map((u) => ({ id: u.id, label: u.name ?? u.email }));
  }

  return {
    session,
    hostOptions,
    nativeVideoAvailable: videoHints.nativeVideoAvailable,
    autoRoomOnCreate: videoHints.autoRoomOnCreate,
    zoomOAuthConfigured: zoomStatus.zoomOAuthConfigured,
    hostZoomConnected: zoomStatus.hostZoomConnected,
  };
}
