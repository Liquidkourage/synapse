import Link from "next/link";
import { LiveVideoRouteChooser } from "@/components/live-video-route-chooser";
import { getHostNewEventPageContext } from "@/lib/host-new-event-page";

export default async function NewHostEventChooserPage({
  searchParams,
}: {
  searchParams: Promise<{ podcastError?: string }>;
}) {
  const { nativeVideoAvailable, zoomOAuthConfigured, hostZoomConnected } = await getHostNewEventPageContext();
  const { podcastError } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/host/events" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Your events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">New live event — choose video route</h1>
      </div>
      {podcastError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/90">
          {podcastError}
        </p>
      ) : null}
      <LiveVideoRouteChooser
        nativeVideoAvailable={nativeVideoAvailable}
        zoomOAuthConfigured={zoomOAuthConfigured}
        hostZoomConnected={hostZoomConnected}
      />
    </div>
  );
}
