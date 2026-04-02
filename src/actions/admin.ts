"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function adminSetUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as Role;
  if (!userId || !["ADMIN", "PRODUCER", "HOST", "PLAYER"].includes(role)) {
    return;
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function adminSetFeaturedLive(formData: FormData) {
  await requireAdmin();
  const eventId = (formData.get("eventId") as string) || "";
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", featuredLiveEventId: eventId || null },
    update: { featuredLiveEventId: eventId || null },
  });
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/admin");
}

const settingsSchema = z.object({
  siteName: z.string().min(1).max(80),
  tagline: z.string().max(200).optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
});

export async function adminUpdateSiteSettings(formData: FormData) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    siteName: formData.get("siteName"),
    tagline: formData.get("tagline") || undefined,
    heroTitle: formData.get("heroTitle") || undefined,
    heroSubtitle: formData.get("heroSubtitle") || undefined,
  });
  if (!parsed.success) return;
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function adminAddHomepageBlock(formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  const blockType = (formData.get("blockType") as string) || "upcoming";
  if (!title) return;
  const session = await auth();
  await prisma.homepageBlock.create({
    data: {
      title,
      blockType,
      sortOrder: Number(formData.get("sortOrder") || 0),
      createdById: session?.user?.id,
    },
  });
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}
