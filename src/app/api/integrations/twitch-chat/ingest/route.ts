import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  eventId: z.string().min(1),
  /** Must match Event.twitchChannelLogin (case-insensitive) */
  channel: z.string().min(1).max(80),
  /** Stable id for deduplication (e.g. Twitch tags.id) */
  externalId: z.string().min(1).max(200),
  author: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});

function authOk(request: Request): boolean {
  const secret = process.env.TWITCH_CHAT_INGEST_SECRET?.trim();
  if (!secret) return false;
  const hdr = request.headers.get("authorization");
  const token = hdr?.startsWith("Bearer ") ? hdr.slice(7).trim() : "";
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(secret, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Ingest Twitch chat lines from the optional bridge (scripts/twitch-chat-bridge.mjs).
 * POST JSON + Authorization: Bearer TWITCH_CHAT_INGEST_SECRET
 */
export async function POST(request: Request) {
  if (!authOk(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { eventId, channel, externalId, author, body } = parsed.data;
  const channelNorm = channel.replace(/^#/, "").trim().toLowerCase();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, twitchChannelLogin: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const expected = event.twitchChannelLogin?.trim().toLowerCase();
  if (!expected || expected !== channelNorm) {
    return NextResponse.json({ error: "Channel does not match event" }, { status: 403 });
  }

  try {
    await prisma.chatMessage.create({
      data: {
        eventId,
        chatSource: "twitch",
        externalDedupeKey: externalId,
        guestName: author.trim(),
        body: body.trim(),
      },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
