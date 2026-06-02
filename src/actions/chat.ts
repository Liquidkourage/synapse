"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { relaySynapseChatToTwitch } from "@/lib/twitch-send-chat";
import { z } from "zod";

const schema = z.object({
  eventId: z.string(),
  eventSlug: z.string(),
  body: z.string().min(1).max(2000),
});

export async function postEventMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const parsed = schema.safeParse({
    eventId: formData.get("eventId"),
    eventSlug: formData.get("eventSlug"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  const { eventId, eventSlug, body } = parsed.data;

  await prisma.chatMessage.create({
    data: {
      eventId,
      userId: session?.user?.id,
      body: body.trim(),
      chatSource: "synapse",
    },
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { twitchChannelLogin: true },
  });
  const twitchLogin = event?.twitchChannelLogin?.trim();
  if (twitchLogin) {
    let authorLabel = "Guest";
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      authorLabel = u?.name?.trim() || u?.email?.trim() || "User";
    }
    void relaySynapseChatToTwitch({
      twitchChannelLogin: twitchLogin,
      authorLabel,
      body: body.trim(),
    });
  }

  // Do not revalidate the event page here: it remounts the broadcast iframe (e.g. Daily) and
  // interrupts the stream. Chat UI updates via client fetch + polling.
}
