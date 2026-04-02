import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const messages = await prisma.chatMessage.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: m.user?.name ?? m.user?.email ?? m.guestName ?? "Guest",
    })),
  });
}
