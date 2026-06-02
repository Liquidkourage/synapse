"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  eventId: z.string(),
  body: z.string().min(1).max(300),
  pinned: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v !== "false"),
});

async function canManageEvent(eventId: string, user: { id: string; role?: string } | undefined | null) {
  if (!user?.id) return false;
  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { hostId: true, producerId: true },
  });
  if (!ev) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "HOST" && ev.hostId === user.id) return true;
  if (user.role === "PRODUCER" && ev.producerId === user.id) return true;
  return false;
}

export async function postEventAnnouncement(formData: FormData) {
  const session = await auth();
  const parsed = postSchema.safeParse({
    eventId: formData.get("eventId"),
    body: formData.get("body"),
    pinned: formData.get("pinned") ?? undefined,
  });
  if (!parsed.success) return;

  const { eventId, body, pinned } = parsed.data;
  const ok = await canManageEvent(eventId, session?.user ?? null);
  if (!ok) return;

  await prisma.$transaction(async (tx) => {
    if (pinned) {
      await tx.eventAnnouncement.updateMany({
        where: { eventId, pinned: true },
        data: { pinned: false },
      });
    }
    await tx.eventAnnouncement.create({
      data: {
        eventId,
        body: body.trim(),
        pinned,
        createdById: session!.user!.id,
      },
    });
  });
}

const clearSchema = z.object({ eventId: z.string() });

export async function clearPinnedEventAnnouncement(formData: FormData) {
  const session = await auth();
  const parsed = clearSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return;
  const { eventId } = parsed.data;

  const ok = await canManageEvent(eventId, session?.user ?? null);
  if (!ok) return;

  await prisma.$transaction(async (tx) => {
    await tx.eventAnnouncement.updateMany({
      where: { eventId, pinned: true },
      data: { pinned: false },
    });
    // Emit a "clear" event for real-time clients (no pinned announcement remains).
    await tx.eventAnnouncement.create({
      data: {
        eventId,
        body: "",
        pinned: false,
        createdById: session!.user!.id,
      },
    });
  });
}

