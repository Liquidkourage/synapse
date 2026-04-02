"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = schema.safeParse({
    displayName: formData.get("displayName") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success) return;

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      displayName: parsed.data.displayName?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
    },
    update: {
      displayName: parsed.data.displayName?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
    },
  });

  revalidatePath("/account");
}
