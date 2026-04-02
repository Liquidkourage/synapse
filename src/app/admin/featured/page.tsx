import { prisma } from "@/lib/prisma";
import { adminSetFeaturedLive } from "@/actions/admin";
import { getSiteSettings } from "@/lib/queries";

export default async function AdminFeaturedPage() {
  const settings = await getSiteSettings();
  const events = await prisma.event.findMany({
    where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { startAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Featured live event</h1>
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
    </div>
  );
}
