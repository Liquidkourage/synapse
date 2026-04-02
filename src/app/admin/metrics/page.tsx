import { prisma } from "@/lib/prisma";

export default async function AdminMetricsPage() {
  const now = new Date();
  const [users, events, upcoming, archived, rsvps, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.event.count({ where: { endAt: { gte: now }, status: { notIn: ["DRAFT", "CANCELLED"] } } }),
    prisma.event.count({ where: { status: "ARCHIVED" } }),
    prisma.eventAttendance.count(),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Metrics</h1>
      <p className="text-sm text-zinc-500">Very basic counts — enough to sanity-check growth.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Metric label="Users" value={users} />
        <Metric label="Total events" value={events} />
        <Metric label="Upcoming / active window" value={upcoming} />
        <Metric label="Archived events" value={archived} />
        <Metric label="Event RSVPs (joins)" value={rsvps} />
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-white">Users by role</h2>
        <ul className="mt-3 space-y-1 text-sm text-zinc-400">
          {byRole.map((r) => (
            <li key={r.role}>
              {r.role}: <strong className="text-zinc-200">{r._count.role}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
