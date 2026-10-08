"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertAdminMembershipGrant } from "@/lib/membership";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) throw new Error("Unauthorized");
  return session;
}

const grantSchema = z.object({
  userId: z.string().min(1),
  note: z.string().max(500).optional(),
  expiresAt: z.string().optional(),
  action: z.enum(["grant", "revoke", "expire"]),
});

export async function adminSetMembershipGrant(formData: FormData) {
  const session = await requireAdmin();
  const parsed = grantSchema.safeParse({
    userId: formData.get("userId"),
    note: formData.get("note") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    action: formData.get("action") || "grant",
  });
  if (!parsed.success) return;

  const { userId, note, action } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (action === "grant") {
    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    await upsertAdminMembershipGrant({
      userId,
      adminUserId: session.user!.id!,
      note,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      status: "ACTIVE",
    });
  } else if (action === "revoke") {
    await upsertAdminMembershipGrant({
      userId,
      adminUserId: session.user!.id!,
      note: note ?? "Revoked by admin",
      status: "CANCELED",
    });
  } else {
    await upsertAdminMembershipGrant({
      userId,
      adminUserId: session.user!.id!,
      note: note ?? "Expired by admin",
      status: "EXPIRED",
    });
  }

  revalidatePath("/admin/memberships");
  revalidatePath("/admin/users");
  revalidatePath("/account");
}

const creatorSchema = z.object({
  userId: z.string().min(1),
  creatorSlug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  creatorActive: z.enum(["on", "off"]).optional(),
  referralCode: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
});

export async function adminUpsertCreatorProfile(formData: FormData) {
  await requireAdmin();
  const parsed = creatorSchema.safeParse({
    userId: formData.get("userId"),
    creatorSlug: String(formData.get("creatorSlug") || "")
      .trim()
      .toLowerCase(),
    creatorActive: formData.get("creatorActive") === "on" ? "on" : "off",
    referralCode: formData.get("referralCode")
      ? String(formData.get("referralCode")).trim().toLowerCase()
      : undefined,
  });
  if (!parsed.success) return;

  const { userId, creatorSlug, referralCode } = parsed.data;
  const creatorActive = parsed.data.creatorActive === "on";

  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      creatorSlug,
      creatorActive,
      ...(creatorActive && u.role === "PLAYER" ? { role: "HOST" as const } : {}),
    },
  });

  if (referralCode) {
    await prisma.creatorReferralCode.upsert({
      where: { code: referralCode },
      create: { code: referralCode, creatorId: userId, active: true },
      update: { creatorId: userId, active: true },
    });
  } else if (creatorSlug) {
    await prisma.creatorReferralCode.upsert({
      where: { code: creatorSlug },
      create: { code: creatorSlug, creatorId: userId, active: true },
      update: { creatorId: userId, active: creatorActive },
    });
  }

  revalidatePath("/admin/memberships");
  revalidatePath(`/creators/${creatorSlug}`);
}
