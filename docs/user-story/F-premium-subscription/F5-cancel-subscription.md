---
title: "[STORY][RECIPIENT] Cancel Premium Subscription"
labels: user-story
---

**Traceability:** PRD `F5` — *(new — not specified in the SRS/original PRD; see `docs/epic/F-premium-subscription.md` for rationale)* · API: `DELETE /subscriptions/me` (`docs/api_design.md` §10), `POST /webhooks/stripe` `customer.subscription.deleted` (§8)

## User Story
As a **Premium Recipient**,
I can **cancel my Premium subscription from inside the app and keep Premium until the end of the period I already paid for**
so that **I stop future charges without losing access I've already been billed for, and without contacting support or logging into Stripe directly**.

## Acceptance Criteria

- [ ] **Scenario:** Cancelling an active subscription
  - **Given** I am a Recipient on the `PREMIUM` tier with an `ACTIVE` subscription
  - **When** I call `DELETE /subscriptions/me`
  - **Then** the backend calls `stripe.subscriptions.update(<id>, { cancel_at_period_end: true })`, the latest `SUBSCRIPTION` row records `cancelAtPeriodEnd=true`, and the response is `200` with the updated `SubscriptionDTO`

- [ ] **Scenario:** Access continues until the paid period ends
  - **Given** I have cancelled and `currentPeriodEnd` is still in the future
  - **When** I call `GET /subscriptions/me`
  - **Then** `tier` is still `PREMIUM`, `subscription.status` is still `ACTIVE`, and `subscription.cancelAtPeriodEnd` is `true` (so the UI can show "Premium until <date> — won't renew")

- [ ] **Scenario:** Tier lapses at period end
  - **Given** my cancelled subscription reaches `currentPeriodEnd` and Stripe stops billing
  - **When** the `customer.subscription.deleted` webhook arrives
  - **Then** the latest `SUBSCRIPTION.status` becomes `CANCELLED` and `GET /subscriptions/me` derives `tier: 'STANDARD'` from that point on

- [ ] **Scenario:** Premium-gated features stop at lapse, not at cancel
  - **Given** I cancelled but the period has not ended
  - **When** I edit notification preferences (F2)
  - **Then** it still works — the `403` gate follows the derived tier, which is still `PREMIUM` until `currentPeriodEnd`

- [ ] **Scenario:** Re-subscribing after cancelling but before lapse
  - **Given** I cancelled (`cancelAtPeriodEnd=true`) and the period has not ended
  - **When** I choose to resume
  - **Then** `DELETE /subscriptions/me` is reversible by an "undo cancel" that calls `stripe.subscriptions.update(<id>, { cancel_at_period_end: false })` and clears the local flag — no new Checkout Session, no second charge

- [ ] **Scenario:** Nothing to cancel
  - **Given** I am a `STANDARD` Recipient with no `ACTIVE` subscription (never subscribed, or already lapsed)
  - **When** I call `DELETE /subscriptions/me`
  - **Then** the request is rejected with `409` ("no active subscription to cancel") and no Stripe call is made

- [ ] **Scenario:** Idempotent double-cancel
  - **Given** my subscription is already `cancelAtPeriodEnd=true`
  - **When** I call `DELETE /subscriptions/me` again
  - **Then** it is a no-op success (`200`, same DTO) — not a second Stripe mutation, not an error

- [ ] **Scenario:** Only the owner can cancel
  - **Given** any caller
  - **When** `DELETE /subscriptions/me` runs
  - **Then** it only ever targets the authenticated Recipient's own subscription — there is no path to cancel another user's

## Implementation Flow

1. **`cancel_at_period_end`, never an immediate delete** — the Recipient paid for the current period, so the Stripe call is `subscriptions.update(id, { cancel_at_period_end: true })`. Do not call `subscriptions.cancel()` / `subscriptions.del()`; that would revoke access mid-period and force proration questions the PRD explicitly keeps out of scope.
2. **Add `cancelAtPeriodEnd: boolean` to the `SUBSCRIPTION` row and to `SubscriptionDTO`** (`docs/api_design.md` §3, `docs/database_design.md`). The `DELETE` handler sets it on the latest row from Stripe's response; the existing `customer.subscription.deleted` webhook (§8) still does the final `status=CANCELLED` flip at period end — this story does **not** change that handler.
3. **Tier derivation is unchanged** — `GET /subscriptions/me` still computes `PREMIUM` iff the latest row is `ACTIVE` and `currentPeriodEnd > now`. A pending cancellation does not affect tier until the period actually ends, so the F2/F3 `403` gate needs no change.
4. **Make it idempotent and reversible.** Re-calling `DELETE` when already pending-cancel is a no-op `200`. Provide the inverse (`cancel_at_period_end: false`) as an "keep my subscription" action while `currentPeriodEnd` is still in the future — cheaper and less confusing than making the Recipient re-run Checkout.
5. **`409` when there is no `ACTIVE` subscription** — guard before any Stripe call so a `STANDARD` user poking the endpoint gets a clean rejection.
6. **Keep the webhook idempotency guard** (`PAYMENT.lastProcessedEventId` / equivalent) covering `customer.subscription.updated` if you choose to also reconcile the flag from that event — but the `DELETE` response is the source of truth for `cancelAtPeriodEnd`, so webhook reconciliation is optional, not required.
7. **UI**: a "Cancel Premium" control in the subscription/account screen with a confirm step that names the access-until date (`currentPeriodEnd`). After cancelling, that screen shows the "won't renew" state and offers the undo action. Render all of this from `GET /subscriptions/me`.
8. **Same blockers as F1** — real Stripe test-mode keys are still placeholders (`docs/blockers.md`); this can't be exercised end-to-end until they're provisioned.

## Related Epic
Premium Subscription (Epic F — #119)
