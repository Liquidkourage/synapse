import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PodcastEpisodeLayout } from "@/components/podcast-episode-layout";
import { isPodcastEvent } from "@/lib/event-kind";
import { podcastEmbedRejectedReason, resolvePodcastEmbed } from "@/lib/podcast-embed";

export default async function PodcastEpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { host: true },
  });
  if (!event) notFound();

  if (!isPodcastEvent(event)) {
    redirect(`/events/${slug}`);
  }

  const podcastEmbed = event.podcastEmbedUrl ? resolvePodcastEmbed(event.podcastEmbedUrl) : null;
  const podcastEmbedError =
    event.podcastEmbedUrl && !podcastEmbed ? podcastEmbedRejectedReason(event.podcastEmbedUrl) : null;

  return (
    <PodcastEpisodeLayout event={event} podcastEmbed={podcastEmbed} podcastEmbedError={podcastEmbedError} />
  );
}
