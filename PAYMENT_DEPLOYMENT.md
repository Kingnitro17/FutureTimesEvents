# Paynow/EcoCash staged deployment

Status: code-ready foundation; **not applied to a database and not live-payment certified**.

## Architecture

Paid checkout is separate from the existing free claim RPC. `create-order` calls
`create_ticket_order_atomic`, which locks event/ticket-type inventory, reads prices
from PostgreSQL, snapshots fees, and creates expiring reservations. `create-payment`
loads the authenticated user's recorded total and initiates EcoCash through the
provider-independent `PaymentProvider` interface. `paynow-result` verifies Paynow's
SHA-512 message hash, fingerprints callbacks, compares the amount, and invokes
`confirm_order_payment_and_issue_tickets`. That transaction locks the order, checks
the verified attempt, converts reservations, decrements inventory, and issues one
hashed QR credential per admission. Replays return existing tickets.

The immutable `financial_ledger` is the wallet source of truth. Referral and payout
tables/RLS are foundation-only in this phase; reward qualification and payout review
Edge Functions must be completed before those features are enabled in UI.

## Required secrets

Set these with `supabase secrets set` in the correct **test** project. Never prefix
them with `NEXT_PUBLIC_` and never commit their values:

- `PAYMENT_PROVIDER=paynow`
- `PAYNOW_INTEGRATION_ID`
- `PAYNOW_INTEGRATION_KEY`
- `APP_BASE_URL`
- Supabase-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

## Review and deploy

1. Back up staging and review `013_payment_referral_foundation.sql`, especially fee
   defaults, reward amounts, payout minimum, RLS, and the profile columns used by
   fulfillment.
2. With explicit human approval, apply migration 013 in the Supabase SQL editor.
3. Deploy `_shared`, then `create-order`, `create-payment`, and `paynow-result`.
   The Paynow result URL is `<SUPABASE_URL>/functions/v1/paynow-result`.
4. Configure only Paynow test credentials and enable EcoCash on that test integration.
5. Test success, delayed success, failure, cancellation, bad hash, amount mismatch,
   duplicate callback, expired reservation, refresh recovery, and two buyers racing
   for the final ticket. Verify free claims and duplicate scan protection again.
6. Do not activate live credentials until finance/security review and the full test
   matrix passes. Run one low-value controlled real purchase before public sales.

## Rollback

Disable paid ticket types or remove Edge Function routing first. Preserve all orders,
payments, events, ledger, and audit records. Migration 013 is additive; rollback by
revoking function execution and archiving the new tables after exporting/reconciling
them. Do not drop financial records or restore `quantity_available` without a manual
order/reservation/ticket reconciliation.

## Reconciliation queries

- Paid without fulfillment: orders in `paid` or `reconciliation_required` with no tickets.
- Tickets without verified payment: paid-order tickets whose payment attempt is not `paid`.
- Provider/internal mismatch: payment events with `processing_result='amount_mismatch'`.
- Expired holds: active reservations whose `expires_at <= now()`.

Paynow polling/status refresh, automated reservation scheduling, refunds, referral
qualification, payout review, organizer settlements, exports, and finance dashboards
remain gated follow-up work; they must not be represented as production-complete.
