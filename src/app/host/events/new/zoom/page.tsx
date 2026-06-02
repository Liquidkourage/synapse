import Link from "next/link";
import { EventCreateForm } from "@/components/event-form";
import { getHostNewEventPageContext } from "@/lib/host-new-event-page";

export default async function NewHostEventZoomPage() {
  const ctx = await getHostNewEventPageContext();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/host/events/new" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Choose route
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-sky-200">New event — Zoom route</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">
          Zoom for teams and breakouts; host stage on top for your camera. Stay in the Zoom UI you already know.
        </p>
      </div>
      <EventCreateForm
        hostOptions={ctx.hostOptions}
        nativeVideoAvailable={ctx.nativeVideoAvailable}
        autoRoomOnCreate={ctx.autoRoomOnCreate}
        zoomOAuthConfigured={ctx.zoomOAuthConfigured}
        hostZoomConnected={ctx.hostZoomConnected}
        initialVideoRoute="zoom"
        showVideoRoutePicker={false}
      />
    </div>
  );
}
