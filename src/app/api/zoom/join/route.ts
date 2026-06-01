import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewBroadcastEmbed } from "@/lib/broadcast-access";
import { prisma } from "@/lib/prisma";
import { createZoomMeetingSdkSignature } from "@/lib/zoom-sdk-signature";
import { fetchZoomHostZak, isZoomNativeEvent, zoomZakErrorMessage } from "@/lib/zoom-meetings";
import { getZoomMeetingSdkConfig } from "@/lib/zoom-config";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !isZoomNativeEvent(event) || !event.zoomMeetingNumber) {
    return NextResponse.json({ error: "No Zoom meeting for this event" }, { status: 404 });
  }

  if (
    !canViewBroadcastEmbed(
      {
        hostId: event.hostId,
        producerId: event.producerId,
        broadcastHostOnlyJoin: event.broadcastHostOnlyJoin ?? false,
      },
      session,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sdkKey, configured } = getZoomMeetingSdkConfig();
  if (!configured || !sdkKey) {
    return NextResponse.json({ error: "Zoom Meeting SDK not configured" }, { status: 503 });
  }

  const isHost = session?.user?.id === event.hostId;
  const role: 0 | 1 = isHost ? 1 : 0;
  const signature = await createZoomMeetingSdkSignature(event.zoomMeetingNumber, role);
  if (!signature) {
    return NextResponse.json({ error: "Could not create meeting signature" }, { status: 503 });
  }

  const zakResult = isHost ? await fetchZoomHostZak(event.hostId) : null;
  if (isHost && zakResult && !zakResult.ok) {
    return NextResponse.json({ error: zoomZakErrorMessage(zakResult) }, { status: 503 });
  }
  const zak = zakResult?.ok ? zakResult.token : null;
  const display =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    (isHost ? "Host" : "Guest");

  return NextResponse.json({
    sdkKey,
    signature,
    meetingNumber: event.zoomMeetingNumber,
    password: event.zoomMeetingPasscode ?? "",
    userName: display,
    userEmail: session?.user?.email ?? "",
    role,
    zak,
    breakoutsEnabled: event.broadcastBreakoutsEnabled,
    eventSlug: event.slug,
  });
}
