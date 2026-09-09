---
title: "[EPIC] Premium Subscription"
labels: epic
---

**Traceability:** PRD Epic F (`docs/PRD.md` §7) · SRS `5.3.1`, `5.3.2`, `6`. Ultimo throughout, with PRD §10 deviations on `6.1.1` (no AFF Wallet — Stripe recurring billing only) and `5.3.3` (location-aware ranking dropped) · API: `docs/api_design.md` §10, §8 (Stripe webhook), §12

## Goal
Let a Recipient upgrade to Premium for $5/month via Stripe recurring billing, then act on that tier: save notification preferences and receive live in-session alerts when a new listing matches one of them — so Premium members hear about relevant food fast, without a persisted inbox.

## User Stories
- [ ] #120 — Stripe Recurring Subscription
- [ ] #121 — Notification Preferences
- [ ] #122 — Real-Time Match Alerts
- [ ] #123 — Cancel Premium Subscription *(new — not in the original PRD)*

> **F4 — Location-Aware Ranking** was **dropped** (SRS `5.3.3`, recorded as a PRD §10 deviation). Story IDs are not renumbered; there is no F4.

## Acceptance Criteria
- [ ] A Recipient can start a Stripe subscription-mode Checkout Session ($5/month) via `POST /subscriptions/checkout-session`; a Stripe Customer is created first if the Recipient has none (shared with order checkout, §7)
- [ ] On `invoice.paid` / `checkout.session.completed`, the `POST /webhooks/stripe` handler appends a new `SUBSCRIPTION` row and sends a confirmation email (Nodemailer) — no email is sent before Stripe confirms
- [ ] `RECIPIENT.tier` is *derived*, never stored as a writable field: `PREMIUM` iff the latest `SUBSCRIPTION` row is `ACTIVE` and `currentPeriodEnd` is in the future, else `STANDARD`
- [ ] A Premium Recipient can save multiple notification preferences (title, categories, vegetarian, price range, city) via `PUT /recipients/me/preferences`, which fully replaces the list
- [ ] `PUT /recipients/me/preferences` returns `403` for a non-Premium Recipient and `400` for an invalid category enum or malformed price range
- [ ] When a new `ACTIVE` listing is created, the service layer compares it against every Premium Recipient's saved preferences and emits `notification:premium_match` (`{ listingId, name, matchedPreferenceId }`) to `user:<recipientId>` for each match
- [ ] The match alert is a live, in-session toast only — a transient `NOTIFICATION` (type=PREMIUM_MATCH) with no read/unread state, consistent with the "no persisted inbox" scope boundary
- [ ] A Premium Recipient can cancel via `DELETE /subscriptions/me`, which calls Stripe with `cancel_at_period_end: true` — Premium access continues until `currentPeriodEnd`, then the existing `customer.subscription.deleted` webhook flips the row to `CANCELLED` and the derived tier lapses to `STANDARD`
- [ ] Cancelling is idempotent and reversible while the period is still open (a "keep my subscription" inverse call, no re-checkout); `DELETE /subscriptions/me` returns `409` when there is no `ACTIVE` subscription
- [ ] A Standard Recipient sees none of the above surfaced — no preference form, no match toasts, no cancel control

## Out of Scope
- **AFF Wallet / stored balance** — no wallet path is implemented anywhere; Premium is Stripe recurring billing only (PRD §8, §10 deviation on `6.1.1`)
- **A persisted notification inbox** — match alerts are transient live-feed events with no read-state tracking (PRD §8)
- **Proration, plan tiers, annual billing, coupons** — a single $5/month plan, nothing more
- **Dunning / failed-payment recovery UX** — `SUBSCRIPTION.status` can reflect `PAST_DUE`/`CANCELLED` from Stripe, but no in-app retry or grace-period flow is built
- **Proration / partial refunds on cancellation** — F5 cancels at period end only; a Recipient who cancels keeps the access they paid for and gets no money back for the unused remainder
- **The listing-creation write itself** — that's Epic C (C1); F3 only hooks the post-create matching trigger
- **Location-aware / proximity ranking of listings** — was F4 (SRS `5.3.3`); **cut from scope** (PRD §10). `GET /listings` keeps only its base `sort=price`; no `rank=proximity` mode, no geolocation prompt on the browse screen

## Notes
- Per `docs/blockers.md`: **F1 is 🟡 Partial** — real Stripe keys are still placeholders in `.env.example`, the transactional email provider is unfinalized (§11), and Stripe webhook event set + idempotency handling are unspecified (§11); PRD §9 flags this story as likely to take longer than expected. **F2 is 🟡 Partial** — depends on reaching Premium tier first (F1). **F3 is 🔴 Blocked** — on F2 + the C1 listing-creation rebuild + the shared Socket.IO layer. **F5 is 🟡 Partial** — same Stripe-credential gap as F1; otherwise self-contained.
- **F4 (Location-Aware Ranking) was dropped.** SRS `5.3.3` is now an explicit PRD §10 deviation. No `rank=proximity` mode is added to `GET /listings` (`docs/api_design.md` §6), no story file exists, and story IDs are not renumbered — F5 stays F5. Donor coordinates (`DONOR.location`) are still captured and used for delivery mapping (Epic E), just not for Recipient-side listing ranking.
- **F5 is new scope, not in the original PRD.** The system already *recorded* externally-driven cancellation (the `customer.subscription.deleted` webhook flips the latest row to `CANCELLED`, `docs/api_design.md` §8), and `SubscriptionStatus` already carried `CANCELLED` — strongly implying an in-app cancel was anticipated but never specified. F5 fills that gap with a first-party `DELETE /subscriptions/me` (`cancel_at_period_end: true`), and does **not** modify the existing webhook handler. It adds one field — `cancelAtPeriodEnd: boolean` — to the `SUBSCRIPTION` row and `SubscriptionDTO` (`docs/api_design.md` §3, §10; `docs/database_design.md`).
- `SUBSCRIPTION` is **append-only for billing history** — one new row per billing cycle (`docs/database_design.md`); never rewrite an existing row's `currentPeriodEnd` or back-date a cycle. The lifecycle flags on the *latest* row are the exception the system already relies on: the webhook mutates `status` (`PAST_DUE`, `CANCELLED`) in place, and F5 mutates `cancelAtPeriodEnd` in place. `GET /subscriptions/me` returns the latest row plus the derived `tier`, and is the endpoint the upgrade/Premium UI state renders from.
- F3's matching runs in the Service layer on listing creation — it shares the one Socket.IO layer with C9 (`listing:sold_out`), G5 (`notification:admin_cancel`), and the Courier tracking events (E6/E8/E9). Stand up that shared layer before F3 can be demoed.
- Open PRD questions in §11 (email provider choice, exact Stripe webhook event set) are marked non-blocking for *starting* F1, but the story is not complete until the team decides them.
- Premium tier gating (`403` on `PUT /recipients/me/preferences` for non-Premium) is the single enforcement point — F2 and F3 both assume tier is checked there and in the Service layer, not re-derived ad hoc in the UI.
