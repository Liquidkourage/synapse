"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";
import {
  applyFirstTouchReferralToUser,
  readReferralCookieFromRequest,
} from "@/lib/referral";
import {
  ensureDefaultAllocationPreference,
  setReferralAllocationSuggestion,
} from "@/lib/support-allocations";
import { z } from "zod";

const reg = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(80).optional(),
});

export async function registerUser(_prev: unknown, formData: FormData) {
  const parsed = reg.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Check your email and password (min 8 characters)." };
  }
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false as const, error: "That email is already registered." };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name?.trim() || null,
      role: "PLAYER",
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });

  const touch = await readReferralCookieFromRequest();
  if (touch) {
    await applyFirstTouchReferralToUser(user.id, {
      creatorId: touch.creatorId,
      code: touch.code,
    });
    await setReferralAllocationSuggestion(user.id, touch.creatorId);
  } else {
    await ensureDefaultAllocationPreference(user.id);
  }

  await sendWelcomeEmail(email, parsed.data.name);
  return { ok: true as const };
}
