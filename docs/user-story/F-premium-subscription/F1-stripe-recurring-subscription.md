---
title: "[STORY][RECIPIENT] Stripe Recurring Subscription"
labels: user-story
---

**Traceability:** PRD `F1` (SRS `6.2.1`; `6.1.1`'s wallet path not implemented — PRD §10) · API: `POST /subscriptions/checkout-session`, `GET /subscriptions/me` (`docs/api_design.md` §10), `POST /webhooks/stripe` (§8)

## User Story
As a **Recipient**,
I can **subscribe to Premium for $5/month through Stripe recurring billing and get an email confirmation when the first payment succeeds**
so that **I unlock preference-based match alerts without any stored-balance wallet**.

## Acceptance Criteria

- [ ] **Scenario:** Starting a subscription checkout
  - **Given** I am a logged-in Recipient on the `STANDARD` tier
  - **When** I call `POST /subscriptions/checkout-session`
  - **Then** a Stripe subscription-mode Checkout Session ($5/month) is created and I get back `{ checkoutUrl }`

- [ ] **Scenario:** Stripe Customer is created on first use
  - **Given** I have never paid by card and have no Stripe customer ID
  - **When** I start the subscription checkout
  - **Then** a Stripe Customer is created first (same shared logic as `POST /orders/:id/checkout-session`), and my raw customer ID is never returned to the client

- [ ] **Scenario:** Successful first payment upgrades me to Premium
  - **Given** I complete Stripe checkout successfully
  - **When** the `POST /webhooks/stripe` handler receives the paid event
  - **Then** a new `SUBSCRIPTION` row is appended (`status=ACTIVE`, `currentPeriodEnd` in the future) and `GET /subscriptions/me` reports `tier: 'PREMIUM'`

- [ ] **Scenario:** Confirmation email is sent only after Stripe confirms
  - **Given** the webhook has processed the successful payment
  - **When** the `SUBSCRIPTION` row is created
  - **Then** a confirmation email is sent via Nodemailer — and no email is sent at checkout-session creation time, only on confirmed payment

- [ ] **Scenario:** Tier is derived, never stored writable
  - **Given** my latest `SUBSCRIPTION` row's `currentPeriodEnd` has passed and no newer `ACTIVE` row exists
  - **When** I call `GET /subscriptions/me`
  - **Then** `tier` is `STANDARD` again — it is computed from subscription rows, not a field anyone writes directly

- [ ] **Scenario:** Each billing cycle appends a row
  - **Given** I have been Premium for a month and Stripe bills me again
  - **When** the recurring `invoice.paid` event arrives
  - **Then** a new `SUBSCRIPTION` row is appended (append-only) — the previous row is never mutated

## Implementation Flow

1. **Treat `SUBSCRIPTION` as an append-only ledger.** One row per billing cycle; `RECIPIENT.tier` is a derived read (`ACTIVE` + `currentPeriodEnd > now` on the latest row), computed in one place the Service layer owns — never a column the UI or another endpoint sets.
2. **Reuse the Stripe Customer bootstrap from order checkout** (`docs/api_design.md` §7) rather than writing a second "create customer if missing" path — both call the same helper.
3. **All state changes happen in the webhook, not the checkout-session endpoint.** `POST /subscriptions/checkout-session` only returns a URL. The `SUBSCRIPTION` insert and the confirmation email both live in `POST /webhooks/stripe` (§8), keyed off the Stripe event.
4. **Make the webhook idempotent** — Stripe retries events; processing the same `invoice.paid` twice must not create two rows or send two emails. Dedupe on the Stripe event ID (the exact event set is an open §11 question — pin it with the team before calling this done).
5. **The email provider is unfinalized (§11).** Build against Nodemailer with a transport read from env; keep the confirmation-send behind the same interface so swapping providers is a config change.
6. **Render Premium/upgrade UI state from `GET /subscriptions/me`** — it returns the latest row plus the derived `tier`. Don't infer Premium status client-side from anything else.
7. **Credentials are placeholders** (`.env.example`) — this story cannot be end-to-end tested until real Stripe test-mode keys and an SMTP/transactional-email account are provisioned (`docs/blockers.md`).

## Related Epic
Premium Subscription (Epic F — #119)
