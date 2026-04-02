"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleEventAttendance(eventId: string, eventSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "sign_in" as const };
  }

  const existing = await prisma.eventAttendance.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id },
    },
  });

  if (existing) {
    await prisma.eventAttendance.delete({ where: { id: existing.id } });
    revalidatePath(`/events/${eventSlug}`);
    return { ok: true as const, joined: false as const };
  }

  await prisma.eventAttendance.create({
    data: { eventId, userId: session.user.id },
  });
  revalidatePath(`/events/${eventSlug}`);
  return { ok: true as const, joined: true as const };
}
