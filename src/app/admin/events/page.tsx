import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    take: 100,
    include: { host: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">All events</h1>
      <ul className="space-y-2">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
          >
            <div>
              <Link href={`/events/${e.slug}`} className="font-medium text-white">
                {e.title}
              </Link>
              <p className="text-xs text-zinc-500">
                {e.status} · {e.host.email}
              </p>
            </div>
            <Link href={`/host/events/${e.id}/edit`} className="text-sm text-violet-400 hover:underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
