import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createArchiveEntry } from "@/actions/events";

export default async function ProducerPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PRODUCER" && session.user.role !== "ADMIN")) {
    redirect("/login");
  }

  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    take: 20,
    include: { host: true },
  });

  const archive = await prisma.archiveEntry.findMany({ orderBy: { publishedAt: "desc" }, take: 10 });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Producer</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Admin-lite: events, statuses, archive entries. No global user or site settings here.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-white">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/host/events/new" className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white">
            New event
          </Link>
          <Link href="/host/events" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200">
            All events
          </Link>
          <Link href="/archive" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200">
            Public archive
          </Link>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-white">Recent events</h2>
        <ul className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2">
              <span className="text-zinc-300">{e.title}</span>
              <Link href={`/host/events/${e.id}/edit`} className="text-violet-400 hover:underline">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Add archive entry</h2>
        <form action={createArchiveEntry} className="max-w-xl space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <label className="block text-sm text-zinc-400">Title</label>
            <input name="title" required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Description</label>
            <textarea name="description" rows={3} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Video / replay URL</label>
            <input name="videoUrl" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Thumbnail URL</label>
            <input name="thumbnailUrl" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Link event (optional)</label>
            <select name="eventId" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <option value="">— none —</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Publish archive entry
          </button>
        </form>
        <p className="text-xs text-zinc-600">Recent archive: {archive.map((a) => a.title).join(", ") || "—"}</p>
      </section>
    </div>
  );
}
