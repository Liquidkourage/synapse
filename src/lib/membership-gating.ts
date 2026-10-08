/**
 * Membership participation gating is OFF by default so production discovery and
 * existing free access stay unchanged until an owner explicitly enables it.
 *
 * Set MEMBERSHIP_GATING_ENABLED=1 (or "true") after pilot testing.
 */
export function isMembershipGatingEnabled(): boolean {
  const v = process.env.MEMBERSHIP_GATING_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Optional grace days for PAST_DUE before losing entitlement (default 0). */
export function pastDueGraceDays(): number {
  const n = Number(process.env.MEMBERSHIP_PAST_DUE_GRACE_DAYS ?? "0");
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
