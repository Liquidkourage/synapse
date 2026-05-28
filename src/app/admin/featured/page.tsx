import { prisma } from "@/lib/prisma";
import { adminSetFeaturedLive, adminSetFeaturedPodcast } from "@/actions/admin";
import { getSiteSettings } from "@/lib/queries";

export default async function AdminFeaturedPage() {
  const settings = await getSiteSettings();
  const events = await prisma.event.findMany({
    where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { startAt: "desc" },
    take: 80,
  });
  const podcastEvents = events.filter((e) => e.podcastEmbedUrl?.trim());

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-white">Featured picks</h1>

      <section className="space-y-4">
      <h2 className="text-lg font-medium text-white">Featured live event</h2>
      <p className="text-sm text-zinc-500">
        Only one event should be the public “live” focus sitewide. Clear the selection to fall back to time-based LIVE
        detection.
      </p>
      <form action={adminSetFeaturedLive} className="max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <label className="block text-sm text-zinc-400">Event</label>
          <select
            name="eventId"
            defaultValue={settings.featuredLiveEventId ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          >
            <option value="">— none (auto) —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.slug})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Save featured event
        </button>
      </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Podcast highlight (homepage & /podcasts)</h2>
        <p className="text-sm text-zinc-500">
          Staff pick for the podcast rail. Only events with a public podcast URL are listed.
        </p>
        <form
          action={adminSetFeaturedPodcast}
          className="max-w-xl space-y-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6"
        >
          <div>
            <label className="block text-sm text-zinc-400">Podcast episode (event)</label>
            <select
              name="eventId"
              defaultValue={settings.featuredPodcastEventId ?? ""}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            >
              <option value="">— none —</option>
              {podcastEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.slug})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Save podcast highlight
          </button>
        </form>
        {podcastEvents.length === 0 && (
          <p className="text-xs text-zinc-600">No events with a podcast URL yet — hosts add one on the event form.</p>
        )}
      </section>
    </div>
  );
}
