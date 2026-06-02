import Link from "next/link";
import { EventCreateForm } from "@/components/event-form";
import { getHostNewEventPageContext } from "@/lib/host-new-event-page";

export default async function NewHostEventPage({
  searchParams,
}: {
  searchParams: Promise<{ podcastError?: string }>;
}) {
  const ctx = await getHostNewEventPageContext();
  const { podcastError } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/host/events" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Your events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">New live event</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">
          Zoom for the meeting and breakouts — one video panel. Host stays in the main session; use Broadcast voice so
          teams in breakout rooms hear you.
        </p>
      </div>
      {podcastError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/90">
          {podcastError}
        </p>
      ) : null}
      <EventCreateForm
        hostOptions={ctx.hostOptions}
        zoomOAuthConfigured={ctx.zoomOAuthConfigured}
        hostZoomConnected={ctx.hostZoomConnected}
      />
    </div>
  );
}
