import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isHostOrAbove } from "@/lib/rbac";
import { EventCreateForm } from "@/components/event-form";
import { getSynapseVideoServerHints } from "@/lib/synapse-video";

export default async function NewHostEventPage() {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) redirect("/login");

  const videoHints = getSynapseVideoServerHints();

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
      <EventCreateForm
        hostOptions={hostOptions}
        nativeVideoAvailable={videoHints.nativeVideoAvailable}
        autoRoomOnCreate={videoHints.autoRoomOnCreate}
      />
    </div>
  );
}
