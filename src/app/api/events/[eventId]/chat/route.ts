import { prisma } from "@/lib/prisma";
import { toChatMessageClient } from "@/lib/chat-message-dto";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const messages = await prisma.chatMessage.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  const chronological = [...messages].reverse();
  return NextResponse.json({
    messages: chronological.map((m) => toChatMessageClient(m)),
  });
}
