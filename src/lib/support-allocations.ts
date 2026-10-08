import type { SupportAllocationChangeReason } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const ALLOCATION_TOTAL_BPS = 10_000;

export type AllocationLineInput = {
  /** null / undefined = UNALLOCATED pool */
  creatorId: string | null;
  weightBps: number;
};

export function normalizeAllocationLines(lines: AllocationLineInput[]): AllocationLineInput[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    const key = line.creatorId ?? "__UNALLOCATED__";
    const w = Math.max(0, Math.floor(line.weightBps));
    if (w === 0) continue;
    merged.set(key, (merged.get(key) ?? 0) + w);
  }

  let entries = [...merged.entries()];
  if (entries.length === 0) {
    return [{ creatorId: null, weightBps: ALLOCATION_TOTAL_BPS }];
  }

  const sum = entries.reduce((a, [, w]) => a + w, 0);
  if (sum !== ALLOCATION_TOTAL_BPS) {
    // Scale then fix remainder on largest line.
    entries = entries.map(([k, w]) => [k, Math.floor((w * ALLOCATION_TOTAL_BPS) / sum)] as const);
    let scaled = entries.reduce((a, [, w]) => a + w, 0);
    const diff = ALLOCATION_TOTAL_BPS - scaled;
    if (diff !== 0 && entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      entries[0] = [entries[0]![0], entries[0]![1] + diff];
    }
  }

  return entries.map(([k, w]) => ({
    creatorId: k === "__UNALLOCATED__" ? null : k,
    weightBps: w,
  }));
}

export function assertAllocationSum(lines: AllocationLineInput[]): void {
  const sum = lines.reduce((a, l) => a + l.weightBps, 0);
  if (sum !== ALLOCATION_TOTAL_BPS) {
    throw new Error(`Allocation weights must sum to ${ALLOCATION_TOTAL_BPS} bps (got ${sum})`);
  }
}

async function filterActiveCreatorIds(creatorIds: (string | null)[]): Promise<Set<string>> {
  const ids = creatorIds.filter((x): x is string => !!x);
  if (ids.length === 0) return new Set();
  const rows = await prisma.user.findMany({
    where: { id: { in: ids }, creatorActive: true, creatorSlug: { not: null } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** Move inactive / unknown creators' weight into UNALLOCATED. */
export async function rebalanceLinesForActiveCreators(
  lines: AllocationLineInput[],
): Promise<AllocationLineInput[]> {
  const active = await filterActiveCreatorIds(lines.map((l) => l.creatorId));
  const next: AllocationLineInput[] = [];
  let unallocated = 0;
  for (const line of lines) {
    if (!line.creatorId) {
      unallocated += line.weightBps;
      continue;
    }
    if (active.has(line.creatorId)) {
      next.push(line);
    } else {
      unallocated += line.weightBps;
    }
  }
  if (unallocated > 0) next.push({ creatorId: null, weightBps: unallocated });
  return normalizeAllocationLines(next);
}

export async function ensureDefaultAllocationPreference(userId: string): Promise<void> {
  const existing = await prisma.supportAllocationPreference.findUnique({ where: { userId } });
  if (existing) return;
  await prisma.supportAllocationPreference.create({
    data: {
      userId,
      confirmed: false,
      lines: {
        create: [{ creatorId: null, weightBps: ALLOCATION_TOTAL_BPS }],
      },
    },
  });
}

/** After signup with referral: suggest creator; keep 100% UNALLOCATED until confirm. */
export async function setReferralAllocationSuggestion(
  userId: string,
  suggestedCreatorId: string,
): Promise<void> {
  await ensureDefaultAllocationPreference(userId);
  await prisma.supportAllocationPreference.update({
    where: { userId },
    data: { suggestedCreatorId, confirmed: false },
  });
}

async function logChange(
  userId: string,
  reason: SupportAllocationChangeReason,
  before: AllocationLineInput[],
  after: AllocationLineInput[],
) {
  await prisma.supportAllocationChange.create({
    data: {
      userId,
      reason,
      snapshotJson: JSON.stringify({ before, after }),
    },
  });
}

export async function saveAllocationPreference(opts: {
  userId: string;
  lines: AllocationLineInput[];
  reason: SupportAllocationChangeReason;
  confirm?: boolean;
  clearSuggestion?: boolean;
}): Promise<void> {
  const preference = await prisma.supportAllocationPreference.upsert({
    where: { userId: opts.userId },
    create: { userId: opts.userId, confirmed: false },
    update: {},
    include: { lines: true },
  });

  const before: AllocationLineInput[] = preference.lines.map((l) => ({
    creatorId: l.creatorId,
    weightBps: l.weightBps,
  }));

  let after = await rebalanceLinesForActiveCreators(opts.lines);
  assertAllocationSum(after);

  await prisma.$transaction(async (tx) => {
    await tx.supportAllocationLine.deleteMany({ where: { preferenceId: preference.id } });
    await tx.supportAllocationLine.createMany({
      data: after.map((l) => ({
        preferenceId: preference.id,
        creatorId: l.creatorId,
        weightBps: l.weightBps,
      })),
    });
    await tx.supportAllocationPreference.update({
      where: { id: preference.id },
      data: {
        confirmed: opts.confirm ?? preference.confirmed,
        suggestedCreatorId: opts.clearSuggestion ? null : preference.suggestedCreatorId,
      },
    });
  });

  await logChange(opts.userId, opts.reason, before, after);
}

/** Confirm referral preselect: 100% to suggested creator (requires explicit call). */
export async function confirmSuggestedCreatorAllocation(userId: string): Promise<{ ok: boolean; error?: string }> {
  const pref = await prisma.supportAllocationPreference.findUnique({ where: { userId } });
  if (!pref?.suggestedCreatorId) {
    return { ok: false, error: "No suggested creator to confirm." };
  }
  const creator = await prisma.user.findFirst({
    where: { id: pref.suggestedCreatorId, creatorActive: true },
  });
  if (!creator) {
    return { ok: false, error: "Suggested creator is no longer active." };
  }
  await saveAllocationPreference({
    userId,
    lines: [{ creatorId: creator.id, weightBps: ALLOCATION_TOTAL_BPS }],
    reason: "USER_CONFIRM_SUGGESTION",
    confirm: true,
    clearSuggestion: true,
  });
  return { ok: true };
}

/**
 * Close an immutable period snapshot from *current confirmed preferences*
 * of entitled members. Stores weights only — never dollars owed.
 */
export async function createSupportPeriodSnapshot(opts: {
  periodStart: Date;
  periodEnd: Date;
  note?: string;
}): Promise<string> {
  const prefs = await prisma.supportAllocationPreference.findMany({
    where: { confirmed: true },
    include: {
      lines: true,
      user: { include: { membership: true } },
    },
  });

  const snapshot = await prisma.supportPeriodSnapshot.create({
    data: {
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      closedAt: new Date(),
      note: opts.note ?? "Preference snapshot (not a financial liability)",
    },
  });

  const rows: { snapshotId: string; userId: string; creatorId: string | null; weightBps: number }[] = [];
  for (const pref of prefs) {
    const m = pref.user.membership;
    if (!m || (m.status !== "ACTIVE" && m.status !== "TRIALING" && m.status !== "PAST_DUE")) continue;
    for (const line of pref.lines) {
      rows.push({
        snapshotId: snapshot.id,
        userId: pref.userId,
        creatorId: line.creatorId,
        weightBps: line.weightBps,
      });
    }
  }
  if (rows.length > 0) {
    await prisma.supportPeriodAllocationLine.createMany({ data: rows });
  }
  return snapshot.id;
}
