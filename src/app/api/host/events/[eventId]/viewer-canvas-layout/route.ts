import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { viewerCanvasLayoutV1Z } from "@/lib/viewer-canvas-layout-host";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/** Persist host-published normalized viewer layout for an event. */
export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
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
    (session.user.role === "PRODUCER" && event.producerId === session.user.id) ||
    (session.user.role === "HOST" && event.hostId === session.user.id);
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = viewerCanvasLayoutV1Z.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid layout", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { viewerCanvasLayout: parsed.data },
    select: { slug: true },
  });

  revalidatePath("/live");
  revalidatePath(`/events/${updated.slug}`);

  return NextResponse.json({ ok: true });
}
