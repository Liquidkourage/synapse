/**
 * Pure logic checks for Phase 1 (no DB). Run: node scripts/test-membership-phase1.mjs
 */

function normalizeAllocationLines(lines, TOTAL = 10_000) {
  const merged = new Map();
  for (const line of lines) {
    const key = line.creatorId ?? "__UNALLOCATED__";
    const w = Math.max(0, Math.floor(line.weightBps));
    if (w === 0) continue;
    merged.set(key, (merged.get(key) ?? 0) + w);
  }
  let entries = [...merged.entries()];
  if (entries.length === 0) return [{ creatorId: null, weightBps: TOTAL }];
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  if (sum !== TOTAL) {
    entries = entries.map(([k, w]) => [k, Math.floor((w * TOTAL) / sum)]);
    let scaled = entries.reduce((a, [, w]) => a + w, 0);
    const diff = TOTAL - scaled;
    if (diff !== 0) {
      entries.sort((a, b) => b[1] - a[1]);
      entries[0][1] += diff;
    }
  }
  return entries.map(([k, w]) => ({
    creatorId: k === "__UNALLOCATED__" ? null : k,
    weightBps: w,
  }));
}

function membershipAllows(membership, now = new Date(), graceDays = 0) {
  if (!membership) return false;
  if (membership.adminGrantExpiresAt && membership.adminGrantExpiresAt < now) {
    if (membership.source === "ADMIN_GRANT") return false;
  }
  if (membership.status === "ACTIVE" || membership.status === "TRIALING") {
    if (membership.currentPeriodEnd && membership.currentPeriodEnd < now) return false;
    return true;
  }
  if (membership.status === "PAST_DUE" && graceDays > 0 && membership.pastDueSince) {
    return now.getTime() <= membership.pastDueSince.getTime() + graceDays * 86400000;
  }
  return false;
}

function shouldSetFirstTouch(existing) {
  return !existing;
}

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

const norm = normalizeAllocationLines([
  { creatorId: "a", weightBps: 5000 },
  { creatorId: "b", weightBps: 5000 },
]);
assert(norm.reduce((s, l) => s + l.weightBps, 0) === 10000, "sum 100%");

const empty = normalizeAllocationLines([]);
assert(empty.length === 1 && empty[0].creatorId === null && empty[0].weightBps === 10000, "default unallocated");

assert(shouldSetFirstTouch(null) === true, "first touch empty");
assert(shouldSetFirstTouch({ code: "x" }) === false, "first touch locked");

const now = new Date();
assert(
  membershipAllows({ status: "ACTIVE", source: "ADMIN_GRANT", currentPeriodEnd: null }),
  "admin active",
);
assert(
  !membershipAllows({ status: "EXPIRED", source: "STRIPE", currentPeriodEnd: null }),
  "expired blocked",
);
assert(
  !membershipAllows({
    status: "ACTIVE",
    source: "STRIPE",
    currentPeriodEnd: new Date(now.getTime() - 1000),
  }),
  "stale period blocked",
);
assert(
  !membershipAllows({ status: "PAST_DUE", source: "STRIPE", pastDueSince: now }, now, 0),
  "past_due no grace",
);
assert(
  membershipAllows({ status: "PAST_DUE", source: "STRIPE", pastDueSince: now }, now, 3),
  "past_due with grace",
);

console.log(`OK ${passed} assertions`);
