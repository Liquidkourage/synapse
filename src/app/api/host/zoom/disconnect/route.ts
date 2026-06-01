import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isHostOrAbove } from "@/lib/rbac";
import { disconnectZoomForUser } from "@/lib/zoom-tokens";

export async function POST() {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectZoomForUser(session.user.id);
  return NextResponse.json({ ok: true });
}
