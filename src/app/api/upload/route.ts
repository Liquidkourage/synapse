import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isHostOrAbove } from "@/lib/rbac";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 4MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file as File).name.split(".").pop() || "bin";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);

  const publicUrl = `/uploads/${name}`;
  await prisma.asset.create({
    data: {
      path: publicUrl,
      mimeType: file.type || "application/octet-stream",
      bytes: buf.length,
    },
  });

  return NextResponse.json({ url: publicUrl });
}
