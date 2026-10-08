import Link from "next/link";
import { CreatorCard } from "@/components/creator-card";
import { getPublicCreators } from "@/lib/creators";

export default async function CreatorsDirectoryPage() {
  const creators = await getPublicCreators(48);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Creators</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Independent entertainers on Synapse. Follow a host you already love — then discover the rest of the network.
        </p>
      </div>

      {creators.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {creators.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
          <p className="text-lg font-medium text-zinc-200">Creators are being added</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            When hosts publish profiles on Synapse, they&apos;ll appear here with upcoming shows and invite links.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/schedule" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
              View schedule
            </Link>
            <Link href="/subscribe" className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              Membership
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
