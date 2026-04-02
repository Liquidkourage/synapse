import Link from "next/link";
import type { Event, User } from "@/generated/prisma";
import { getEffectiveEventStatus, statusLabel } from "@/lib/event-status";
import { LocalDateTime } from "@/components/local-datetime";

type Props = {
  event: Event & { host: Pick<User, "name" | "email">; producer?: Pick<User, "name" | "email"> | null };
};

export function EventCard({ event }: Props) {
  const eff = getEffectiveEventStatus(event);
  return (
    <article className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-violet-500/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={`/events/${event.slug}`} className="text-lg font-medium text-white group-hover:text-violet-200">
          {event.title}
        </Link>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{statusLabel(eff)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{event.shortDescription}</p>
      <p className="mt-3 text-xs text-zinc-500">
        <LocalDateTime iso={event.startAt.toISOString()} /> · {event.host.name ?? event.host.email}
      </p>
    </article>
  );
}
