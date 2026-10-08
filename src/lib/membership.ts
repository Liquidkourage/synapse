import type { Session } from "next-auth";
import type { Membership, MembershipSource, MembershipStatus, Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isMembershipGatingEnabled, pastDueGraceDays } from "@/lib/membership-gating";

export type MembershipEntitlementReason =
  | "gating_disabled"
  | "staff"
  | "active"
  | "past_due_grace"
  | "admin_grant_active"
  | "not_entitled"
  | "no_membership"
  | "anonymous";

export type MembershipEntitlement = {
  entitled: boolean;
  reason: MembershipEntitlementReason;
  membership: Membership | null;
  gatingEnabled: boolean;
};

const ENTITLED_STATUSES: MembershipStatus[] = ["ACTIVE", "TRIALING"];

export function membershipStatusAllowsAccess(
  membership: Pick<Membership, "status" | "pastDueSince" | "currentPeriodEnd" | "adminGrantExpiresAt" | "source"> | null,
  now = new Date(),
): { ok: boolean; reason: MembershipEntitlementReason } {
  if (!membership) return { ok: false, reason: "no_membership" };

  if (membership.adminGrantExpiresAt && membership.adminGrantExpiresAt.getTime() < now.getTime()) {
    if (membership.source === "ADMIN_GRANT") {
      return { ok: false, reason: "not_entitled" };
    }
  }

  if (ENTITLED_STATUSES.includes(membership.status)) {
    if (membership.currentPeriodEnd && membership.currentPeriodEnd.getTime() < now.getTime()) {
      // Stale period without webhook — treat as expired until reconciled.
      if (membership.status === "ACTIVE" || membership.status === "TRIALING") {
        return { ok: false, reason: "not_entitled" };
      }
    }
    return {
      ok: true,
      reason: membership.source === "ADMIN_GRANT" ? "admin_grant_active" : "active",
    };
  }

  if (membership.status === "PAST_DUE") {
    const grace = pastDueGraceDays();
    if (grace > 0 && membership.pastDueSince) {
      const deadline = membership.pastDueSince.getTime() + grace * 86_400_000;
      if (now.getTime() <= deadline) return { ok: true, reason: "past_due_grace" };
    }
    return { ok: false, reason: "not_entitled" };
  }

  return { ok: false, reason: "not_entitled" };
}

export function isStaffRole(role: Role | string | undefined | null): boolean {
  return role === "ADMIN" || role === "PRODUCER" || role === "HOST";
}

export function isEventStaff(
  session: Session | null,
  event: { hostId: string; producerId: string | null },
): boolean {
  const uid = session?.user?.id;
  if (!uid) return false;
  if (session.user?.role === "ADMIN") return true;
  if (uid === event.hostId) return true;
  if (session.user?.role === "PRODUCER" && event.producerId === uid) return true;
  return false;
}

export async function getMembershipForUser(userId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({ where: { userId } });
}

/**
 * Central entitlement check. When gating is disabled, everyone is entitled
 * (discovery + existing free participation preserved).
 */
export async function resolveMembershipEntitlement(
  session: Session | null,
  opts?: { event?: { hostId: string; producerId: string | null } },
): Promise<MembershipEntitlement> {
  const gatingEnabled = isMembershipGatingEnabled();

  if (!gatingEnabled) {
    return { entitled: true, reason: "gating_disabled", membership: null, gatingEnabled };
  }

  if (opts?.event && isEventStaff(session, opts.event)) {
    return { entitled: true, reason: "staff", membership: null, gatingEnabled };
  }

  if (session?.user?.role === "ADMIN") {
    return { entitled: true, reason: "staff", membership: null, gatingEnabled };
  }

  const userId = session?.user?.id;
  if (!userId) {
    return { entitled: false, reason: "anonymous", membership: null, gatingEnabled };
  }

  const membership = await getMembershipForUser(userId);
  const { ok, reason } = membershipStatusAllowsAccess(membership);
  return { entitled: ok, reason, membership, gatingEnabled };
}

/** Participation in live play (Zoom join credentials, game embeds, chat post). */
export async function canParticipateInLive(
  session: Session | null,
  event: { hostId: string; producerId: string | null },
): Promise<MembershipEntitlement> {
  return resolveMembershipEntitlement(session, { event });
}

export type AdminGrantInput = {
  userId: string;
  adminUserId: string;
  note?: string | null;
  /** Optional hard end for pilot grants. */
  expiresAt?: Date | null;
  status?: Extract<MembershipStatus, "ACTIVE" | "CANCELED" | "EXPIRED">;
};

export async function upsertAdminMembershipGrant(input: AdminGrantInput): Promise<Membership> {
  const status = input.status ?? "ACTIVE";
  const now = new Date();
  const existing = await prisma.membership.findUnique({ where: { userId: input.userId } });

  // Do not clobber an active Stripe subscription with an admin grant unless canceling/expiring.
  if (existing?.source === "STRIPE" && status === "ACTIVE" && existing.status === "ACTIVE") {
    return existing;
  }

  const data = {
    status,
    source: "ADMIN_GRANT" as MembershipSource,
    adminGrantNote: input.note?.trim() || null,
    adminGrantedById: input.adminUserId,
    adminGrantExpiresAt: input.expiresAt ?? null,
    activatedAt: status === "ACTIVE" ? existing?.activatedAt ?? now : existing?.activatedAt,
    canceledAt: status === "CANCELED" ? now : null,
    expiredAt: status === "EXPIRED" ? now : null,
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: input.expiresAt ?? existing?.currentPeriodEnd ?? null,
  };

  return prisma.membership.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...data },
    update: data,
  });
}
