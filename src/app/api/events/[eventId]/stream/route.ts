import { prisma } from "@/lib/prisma";
import { toChatMessageClient } from "@/lib/chat-message-dto";
import { toEventAnnouncementClient } from "@/lib/event-announcement-dto";

function sseLine(s: string) {
  return `${s}\n`;
}

function sseEvent(event: string, data: unknown) {
  return sseLine(`event: ${event}`) + sseLine(`data: ${JSON.stringify(data)}`) + sseLine("");
}

function parseAfter(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const url = new URL(request.url);
  const afterChat = parseAfter(url.searchParams.get("afterChat"));
  const afterAnnouncement = parseAfter(url.searchParams.get("afterAnnouncement"));

  const encoder = new TextEncoder();

  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      // Initial hello (keeps proxies from buffering forever).
      send(sseLine(": connected"));
      send(sseLine(""));

      // Initial pinned announcement (if any).
      const pinned = await prisma.eventAnnouncement.findFirst({
        where: { eventId, pinned: true },
        orderBy: { createdAt: "desc" },
      });
      if (pinned) {
        send(sseEvent("announcement", { announcement: toEventAnnouncementClient(pinned) }));
      }

      let lastChat = afterChat ?? new Date(0);
      let lastAnn = afterAnnouncement ?? new Date(0);

      const tick = async () => {
        if (closed) return;
        try {
          const [chatRows, annRows] = await Promise.all([
            prisma.chatMessage.findMany({
              where: { eventId, createdAt: { gt: lastChat } },
              orderBy: { createdAt: "asc" },
              take: 50,
              include: { user: { select: { name: true, email: true, profile: { select: { displayName: true } } } } },
            }),
            prisma.eventAnnouncement.findMany({
              where: { eventId, createdAt: { gt: lastAnn } },
              orderBy: { createdAt: "asc" },
              take: 10,
            }),
          ]);

          for (const m of chatRows) {
            lastChat = m.createdAt;
            send(sseEvent("chat", { message: toChatMessageClient(m) }));
          }

          for (const a of annRows) {
            lastAnn = a.createdAt;
            send(sseEvent("announcement", { announcement: toEventAnnouncementClient(a) }));
          }

          // Keep-alive comment so intermediaries don't kill idle streams.
          send(sseLine(`: keepalive ${Date.now()}`));
          send(sseLine(""));
        } catch {
          // Best-effort streaming: ignore tick errors; client will reconnect if needed.
        }
      };

      // Polling on the server is intentionally small + consistent so it works across instances.
      const id = setInterval(tick, 1500);
      tick();

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(id);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Helps nginx/Cloudflare avoid buffering.
      "X-Accel-Buffering": "no",
    },
  });
}

