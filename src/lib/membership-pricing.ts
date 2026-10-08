/**
 * Central membership price display. Stripe Price id stays in env when billing is wired;
 * this module is for consistent public copy only.
 */
export const MEMBERSHIP_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_MEMBERSHIP_PRICE_CENTS ?? "999") || 999;
export const MEMBERSHIP_CURRENCY = (process.env.NEXT_PUBLIC_MEMBERSHIP_CURRENCY ?? "USD").toUpperCase();
export const MEMBERSHIP_INTERVAL_LABEL = "month";

export function formatMembershipPrice(): string {
  const dollars = MEMBERSHIP_PRICE_CENTS / 100;
  const formatted =
    MEMBERSHIP_CURRENCY === "USD"
      ? `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`
      : `${dollars.toFixed(2)} ${MEMBERSHIP_CURRENCY}`;
  return `${formatted}/${MEMBERSHIP_INTERVAL_LABEL}`;
}

export function membershipPriceHeadline(): string {
  return formatMembershipPrice();
}
