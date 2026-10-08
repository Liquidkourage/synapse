import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const REFERRAL_COOKIE = "synapse_ref";
/** First-touch window: cookie max-age (90 days). */
export const REFERRAL_COOKIE_MAX_AGE_SEC = 90 * 24 * 60 * 60;

export type ReferralCookiePayload = {
  code: string;
  creatorId: string;
  setAt: string;
};

export function parseReferralCookie(raw: string | undefined): ReferralCookiePayload | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as ReferralCookiePayload;
    if (!j?.code || !j?.creatorId || !j?.setAt) return null;
    return j;
  } catch {
    return null;
  }
}

export function serializeReferralCookie(payload: ReferralCookiePayload): string {
  return JSON.stringify(payload);
}

/**
 * First-touch: if a referral cookie already exists, do not overwrite.
 * Returns whether a new cookie should be written.
 */
export function shouldSetFirstTouchReferral(
  existingCookie: ReferralCookiePayload | null,
): boolean {
  return !existingCookie;
}

/** Persist first-touch on the user row if empty (never overwrite). */
export async function applyFirstTouchReferralToUser(
  userId: string,
  touch: { creatorId: string; code: string },
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralFirstTouchCreatorId: true },
  });
  if (!user || user.referralFirstTouchCreatorId) return;

  const creator = await prisma.user.findFirst({
    where: { id: touch.creatorId, creatorActive: true, creatorSlug: { not: null } },
    select: { id: true },
  });
  if (!creator) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      referralFirstTouchCreatorId: creator.id,
      referralFirstTouchCode: touch.code.trim().slice(0, 64),
      referralFirstTouchAt: new Date(),
    },
  });
}

/**
 * Permanent attribution after first qualifying *paid* (Stripe) conversion.
 * Never overwrites an existing referredByCreatorId.
 */
export async function attributeReferralOnPaidConversion(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referredByCreatorId: true,
      referralFirstTouchCreatorId: true,
    },
  });
  if (!user || user.referredByCreatorId) return;
  if (!user.referralFirstTouchCreatorId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      referredByCreatorId: user.referralFirstTouchCreatorId,
      referralAttributedAt: new Date(),
    },
  });
}

export async function resolveActiveReferralCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  return prisma.creatorReferralCode.findFirst({
    where: { code: normalized, active: true, creator: { creatorActive: true } },
    include: {
      creator: { select: { id: true, name: true, creatorSlug: true, image: true } },
    },
  });
}

export async function readReferralCookieFromRequest(): Promise<ReferralCookiePayload | null> {
  const jar = await cookies();
  return parseReferralCookie(jar.get(REFERRAL_COOKIE)?.value);
}
