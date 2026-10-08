# Stripe ↔ Synapse membership interface (design — not live)

Stripe Checkout / webhooks are **not implemented yet**. This document is the contract for the next billing slice.

## Principles

1. **Subscription creation alone is not entitlement.** Entitlement requires evidence of a paid, current period (or an explicit `ADMIN_GRANT`).
2. **`Membership.source`** distinguishes `STRIPE` vs `ADMIN_GRANT`. Admin grants never pretend to be Stripe.
3. **Idempotent webhooks** via `Membership.stripeLastEventId` + Stripe event id dedupe table (add `StripeWebhookEvent` if needed).
4. **Referral attribution** (`attributeReferralOnPaidConversion`) runs only after a **qualifying paid** event — not on Checkout Session create, not on signup.

## Checkout Session (to implement)

- Mode: `subscription`
- Price: $9.99/month (Stripe Price id in env)
- Metadata: `{ synapseUserId, referredByCreatorId? }`
- `client_reference_id`: `synapseUserId`
- Success/cancel URLs: `/account`, `/subscribe`

On success redirect alone: **do not** set `ACTIVE`. Wait for webhook.

## Events that establish / maintain entitlement

| Stripe event | Synapse effect |
|--------------|----------------|
| `invoice.paid` (subscription_cycle or subscription_create) with `paid=true` | Set `status=ACTIVE`, `source=STRIPE`, update period start/end, clear `pastDueSince`, set `activatedAt` if first; call `attributeReferralOnPaidConversion` |
| `customer.subscription.updated` | Sync `cancelAtPeriodEnd`, period dates, status mapping |
| `customer.subscription.deleted` | `CANCELED` or `EXPIRED`; set `expiredAt`/`canceledAt` |
| `invoice.payment_failed` | `PAST_DUE` + `pastDueSince` (entitlement per grace env) |
| `checkout.session.completed` | Store `stripeCustomerId` / `stripeSubscriptionId` only; **do not** grant ACTIVE unless invoice already paid in same flow and verified |

### Status mapping

- Stripe `active` → `ACTIVE`
- Stripe `trialing` → `TRIALING` (optional; Synapse may skip trials in v0.1)
- Stripe `past_due` → `PAST_DUE`
- Stripe `canceled` → `CANCELED`
- Stripe `unpaid` / ended → `EXPIRED`

## Duplicate / out-of-order webhooks

1. Persist processed `event.id` (unique). If seen → 200 no-op.
2. Compare `event.created` vs `Membership.stripeLastEventAt`. If older than last applied for same subscription → ignore status regressions unless forced reconcile.
3. Prefer **invoice.paid** as source of truth for entitlement over `checkout.session.completed`.

## Interrupted delivery / reconciliation

- Admin or cron: `stripe.subscriptions.retrieve(stripeSubscriptionId)` → rewrite `Membership` fields.
- List recent invoices; if latest paid and period covers now → `ACTIVE`.
- Never delete membership rows; transition status only.

## Reactivation

New Checkout or Stripe Customer Portal resubscribe → same userId → update existing `Membership` row (unique `userId`).

## What not to build in the Stripe slice

- Creator payouts
- Proration UI beyond Stripe defaults
- Multiple tiers
