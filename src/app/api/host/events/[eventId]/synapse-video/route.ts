import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { provisionDailyRoomForEvent } from "@/lib/synapse-video";
import { NextResponse } from "next/server";

/** Create / refresh the Synapse native video room (Daily.co) for this event. */
export async function POST(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCER" ||
    (session.user.role === "HOST" && event.hostId === session.user.id);
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await provisionDailyRoomForEvent(eventId);
  if (!result.ok) {
    const status = result.error.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ url: result.url });
}
