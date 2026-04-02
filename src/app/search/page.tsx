import Link from "next/link";
import { searchEventsAndArchive } from "@/lib/queries";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { events, archives } = await searchEventsAndArchive(q);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">Search</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Events, archive titles…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder:text-zinc-600"
        />
        <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {!q.trim() && <p className="text-zinc-500">Type something to search events and archive entries.</p>}

      {q.trim() && (
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-medium text-white">Events</h2>
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.slug}`} className="text-violet-400 hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-sm text-zinc-500">{e.shortDescription}</p>
                </li>
              ))}
            </ul>
            {events.length === 0 && <p className="text-zinc-500">No matching events.</p>}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-medium text-white">Archive</h2>
            <ul className="space-y-2">
              {archives.map((a) => (
                <li key={a.id}>
                  <Link href={`/archive#${a.slug}`} className="text-violet-400 hover:underline">
                    {a.title}
                  </Link>
                  {a.description && <p className="text-sm text-zinc-500">{a.description}</p>}
                </li>
              ))}
            </ul>
            {archives.length === 0 && <p className="text-zinc-500">No matching archive entries.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
