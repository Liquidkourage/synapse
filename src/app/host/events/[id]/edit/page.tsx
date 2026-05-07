import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EventEditForm } from "@/components/event-form";
import { EventDeleteButton } from "@/components/event-delete-button";
import { getSynapseVideoServerHints } from "@/lib/synapse-video";

export default async function EditHostEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const videoHints = getSynapseVideoServerHints();

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCER" ||
    (session.user.role === "HOST" && event.hostId === session.user.id);

  if (!canEdit) redirect("/host/events");

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
      <h1 className="text-2xl font-semibold text-white">Edit event</h1>
      <p className="text-sm text-zinc-500">
        Slug: <code className="text-zinc-400">{event.slug}</code> (immutable in V1)
      </p>
      <div className="rounded-xl border border-violet-500/30 bg-violet-950/25 px-4 py-3 text-sm">
        <p className="font-medium text-violet-200">This screen is only the settings form.</p>
        <p className="mt-1 text-zinc-400">
          To preview the real page — stage, video, game embeds, second display, chat — open the public event while logged in
          as host. Game/tool iframes show a short &quot;Preview&quot; note until the event is LIVE for everyone.
        </p>
        <Link
          href={`/events/${event.slug}`}
          className="mt-3 inline-flex rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
        >
          Open event page (preview) → /events/{event.slug}
        </Link>
      </div>
      <EventEditForm
        event={event}
        hostOptions={hostOptions}
        nativeVideoAvailable={videoHints.nativeVideoAvailable}
        autoRoomOnCreate={videoHints.autoRoomOnCreate}
      />
      <div className="border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-medium text-zinc-400">Danger zone</h2>
        <p className="mt-1 text-xs text-zinc-600">Remove this event from Synapse. Linked archive entries stay in the archive list but lose the event link.</p>
        <div className="mt-3">
          <EventDeleteButton eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
