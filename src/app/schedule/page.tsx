import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";

function recurrenceLabel(ruleJson: string) {
  try {
    const j = JSON.parse(ruleJson) as { label?: string };
    return j.label ?? "Recurring";
  } catch {
    return "Recurring";
  }
}

export default async function SchedulePage() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      endAt: { gte: now },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: { host: true, producer: true, recurrenceSeries: true },
    orderBy: { startAt: "asc" },
  });

  const series = await prisma.recurrenceSeries.findMany({
    include: { host: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">Schedule</h1>
        <p className="mt-2 text-zinc-400">
          Times shown in <strong className="text-zinc-200">your local timezone</strong> — because nobody does UTC math at
          party time.
        </p>
      </div>

      {series.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-violet-300">Recurring programming</h2>
          <ul className="space-y-2">
            {series.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="font-medium text-white">{s.title}</span>
                {s.description && <span className="text-zinc-500"> — {s.description}</span>}
                <p className="mt-1 text-xs text-zinc-500">
                  Host: {s.host.name ?? s.host.email} ·{" "}
                  <span className="text-zinc-400">{recurrenceLabel(s.ruleJson)}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Upcoming instances</h2>
        <ol className="space-y-3">
          {events.map((e) => {
            const eff = getEffectiveEventStatus(e);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`/events/${e.slug}`} className="text-lg font-medium text-white hover:text-violet-400">
                    {e.title}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    <LocalDateTime iso={e.startAt.toISOString()} /> ·{" "}
                    <LocalDateTime iso={e.endAt.toISOString()} options={{ timeStyle: "short" }} /> ·{" "}
                    {e.host.name ?? e.host.email}
                  </p>
                  {e.recurrenceNote && (
                    <p className="mt-1 text-xs text-zinc-600">{e.recurrenceNote}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{statusLabel(eff)}</span>
              </li>
            );
          })}
        </ol>
        {events.length === 0 && <p className="text-zinc-500">No scheduled drops yet — check back soon.</p>}
      </section>
    </div>
  );
}
