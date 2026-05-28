import Link from "next/link";
import { notFound } from "next/navigation";
import { PodcastEpisodeCard } from "@/components/podcast-episode-card";
import { getPodcastEpisodes } from "@/lib/podcast-queries";
import { prisma } from "@/lib/prisma";

export default async function PodcastShowPage({ params }: { params: Promise<{ hostId: string }> }) {
  const { hostId } = await params;

  const host = await prisma.user.findUnique({ where: { id: hostId } });
  if (!host) notFound();

  const all = await getPodcastEpisodes(100);
  const episodes = all.filter((e) => e.hostId === hostId);
  if (episodes.length === 0) notFound();

  const title = host.name?.trim() || host.email.split("@")[0] || "Show";
  const cover = episodes[0]?.coverImageUrl ?? host.image;

  return (
    <div className="space-y-8">
      <Link href="/podcasts" className="text-sm text-violet-400 hover:underline">
        ← All podcasts
      </Link>
      <header className="flex flex-wrap items-start gap-6">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-28 w-28 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-violet-950/60 text-4xl">
            🎙️
          </div>
        )}
        <div>
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-zinc-400">
            {episodes.length} {episodes.length === 1 ? "episode" : "episodes"} on Synapse
          </p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((ep) => (
          <PodcastEpisodeCard key={ep.id} episode={ep} />
        ))}
      </div>
    </div>
  );
}
