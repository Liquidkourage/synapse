import Link from "next/link";
import { EventCreateForm } from "@/components/event-form";
import { getHostNewEventPageContext } from "@/lib/host-new-event-page";

export default async function NewHostEventCustomPage() {
  const ctx = await getHostNewEventPageContext();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/host/events/new" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Choose route
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">New event — custom embed</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">Mux, 100ms, or any iframe-safe player URL.</p>
      </div>
      <EventCreateForm
        hostOptions={ctx.hostOptions}
        nativeVideoAvailable={ctx.nativeVideoAvailable}
        autoRoomOnCreate={ctx.autoRoomOnCreate}
        zoomOAuthConfigured={ctx.zoomOAuthConfigured}
        hostZoomConnected={ctx.hostZoomConnected}
        initialVideoRoute="daily"
        initialCustom
        showVideoRoutePicker={false}
      />
    </div>
  );
}
