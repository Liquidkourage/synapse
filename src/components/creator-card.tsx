import Link from "next/link";
import type { PublicCreator } from "@/lib/creators";

export function CreatorCard({ creator }: { creator: PublicCreator }) {
  return (
    <Link
      href={`/creators/${creator.creatorSlug}`}
      className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-violet-500/35"
    >
      {creator.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-950/50 text-xl font-semibold text-violet-200">
          {creator.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-medium text-white">{creator.name}</h3>
        {creator.bio ? <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{creator.bio}</p> : null}
        <p className="mt-2 text-xs text-zinc-600">
          {creator.upcomingCount > 0
            ? `${creator.upcomingCount} upcoming show${creator.upcomingCount === 1 ? "" : "s"}`
            : "Creator on Synapse"}
        </p>
      </div>
    </Link>
  );
}
