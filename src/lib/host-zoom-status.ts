import { prisma } from "@/lib/prisma";
import { getZoomOAuthConfig } from "@/lib/zoom-config";

export async function getHostZoomStatusForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zoomAccessToken: true, zoomAccountEmail: true },
  });
  const oauth = getZoomOAuthConfig();
  return {
    zoomOAuthConfigured: oauth.configured,
    hostZoomConnected: !!user?.zoomAccessToken,
    hostZoomEmail: user?.zoomAccountEmail ?? null,
  };
}
