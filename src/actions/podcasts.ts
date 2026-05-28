"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteEventsCleanup } from "@/lib/event-delete";
import { importPodcastShow, PodcastImportError } from "@/lib/podcast-import";
import { revalidatePodcastSurfaces } from "@/lib/revalidate-podcasts";
import { isHostOrAbove } from "@/lib/rbac";
import type { EventStatus } from "@/generated/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

function podcastShowWhere(
  hostId: string,
  opts: { feedUrl?: string | null; standalone?: boolean },
) {
  if (opts.standalone) {
    return {
      hostId,
      podcastFeedUrl: null,
      OR: [{ eventKind: "PODCAST" as const }, { podcastEmbedUrl: { not: null } }],
    };
  }
  if (!opts.feedUrl?.trim()) return null;
  return { hostId, podcastFeedUrl: opts.feedUrl.trim() };
}

async function assertCanManageHost(hostId: string): Promise<ActionResult | null> {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    return { ok: false, error: "Unauthorized" };
  }
  const canManage =
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCER" ||
    (session.user.role === "HOST" && session.user.id === hostId);
  if (!canManage) return { ok: false, error: "Forbidden" };
  return null;
}

export async function deletePodcastShow(formData: FormData): Promise<ActionResult> {
  const feedUrl = (formData.get("feedUrl") as string)?.trim() || null;
  const standalone = formData.get("standalone") === "1";
  const hostId = (formData.get("hostId") as string)?.trim();
  if (!hostId) return { ok: false, error: "Missing host" };

  const authErr = await assertCanManageHost(hostId);
  if (authErr) return authErr;

  const where = podcastShowWhere(hostId, { feedUrl, standalone });
  if (!where) return { ok: false, error: "Missing feed" };

  const episodes = await prisma.event.findMany({ where, select: { id: true } });
  if (episodes.length === 0) return { ok: false, error: "No episodes to delete" };

  await prisma.$transaction(async (tx) => {
    await deleteEventsCleanup(
      tx,
      episodes.map((e) => e.id),
    );
  });

  revalidatePodcastSurfaces();
  redirect(`/host/events?podcastDeleted=${episodes.length}`);
  return { ok: true };
}

export async function resyncPodcastShow(formData: FormData): Promise<ActionResult> {
  const feedUrl = (formData.get("feedUrl") as string)?.trim();
  const hostId = (formData.get("hostId") as string)?.trim();
  if (!feedUrl || !hostId) return { ok: false, error: "Missing feed or host" };

  const authErr = await assertCanManageHost(hostId);
  if (authErr) return authErr;

  const sample = await prisma.event.findFirst({
    where: { hostId, podcastFeedUrl: feedUrl },
    orderBy: { startAt: "desc" },
  });

  try {
    const result = await importPodcastShow({
      feedOrShowUrl: feedUrl,
      hostId,
      producerId: sample?.producerId ?? null,
      timezone: sample?.timezone ?? "America/New_York",
      status: (sample?.status as EventStatus) ?? "COMPLETED",
      showTitleFallback: sample?.podcastShowTitle ?? sample?.title ?? "Podcast",
      showDescriptionFallback: sample?.shortDescription ?? "",
      coverImageUrl: sample?.coverImageUrl ?? null,
    });
    revalidatePodcastSurfaces();
    const q = new URLSearchParams({
      podcastImported: String(result.created),
      podcastSkipped: String(result.skipped),
      show: result.showTitle,
    });
    redirect(`/host/podcasts?feed=${encodeURIComponent(feedUrl)}&${q.toString()}`);
  } catch (e) {
    if (e instanceof PodcastImportError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }
}

export async function updatePodcastShowTitle(formData: FormData): Promise<ActionResult> {
  const feedUrl = (formData.get("feedUrl") as string)?.trim();
  const hostId = (formData.get("hostId") as string)?.trim();
  const title = (formData.get("podcastShowTitle") as string)?.trim();
  if (!feedUrl || !hostId) return { ok: false, error: "Missing feed or host" };
  if (!title) return { ok: false, error: "Show title is required" };

  const authErr = await assertCanManageHost(hostId);
  if (authErr) return authErr;

  await prisma.event.updateMany({
    where: { hostId, podcastFeedUrl: feedUrl },
    data: { podcastShowTitle: title },
  });

  revalidatePodcastSurfaces();
  revalidatePath(`/podcasts/shows/${hostId}`);
  return { ok: true };
}
