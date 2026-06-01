import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { EventCreateForm } from "@/components/event-form";
import { getSynapseVideoServerHints } from "@/lib/synapse-video";
import { getHostZoomStatusForUser } from "@/lib/host-zoom-status";

export default async function NewHostEventPage({
  searchParams,
}: {
  searchParams: Promise<{ podcastError?: string }>;
}) {
  const { podcastError } = await searchParams;
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">New event</h1>
      {podcastError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/90">
          {podcastError}
        </p>
      ) : null}
      <EventCreateForm
        hostOptions={hostOptions}
        nativeVideoAvailable={videoHints.nativeVideoAvailable}
        autoRoomOnCreate={videoHints.autoRoomOnCreate}
        zoomOAuthConfigured={zoomStatus.zoomOAuthConfigured}
        hostZoomConnected={zoomStatus.hostZoomConnected}
      />
    </div>
  );
}
