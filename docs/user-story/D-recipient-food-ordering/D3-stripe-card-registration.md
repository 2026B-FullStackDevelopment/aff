---
title: "[STORY][RECIPIENT] Stripe Card Registration at First Card Checkout"
labels: user-story
---

**Traceability:** PRD `D3` (new, supports SRS `5.2.3`/`6.2.1`) · API: `POST /orders/:id/checkout-session` (`docs/api_design.md` §7)

## User Story
As a **Recipient**,
the first time I choose to pay by card, I can **register a Stripe payment method as part of that checkout**
so that **I don't need to re-enter card details on future card purchases, including a Premium subscription**.

## Acceptance Criteria

- [ ] **Scenario:** First card checkout creates a Stripe Customer
  - **Given** `RECIPIENT.stripeCustomerId` is unset and I've chosen `paymentMethod: 'STRIPE'` on an order (D2) or a Premium subscription (F1)
  - **When** `POST /orders/:id/checkout-session` (or the equivalent subscription checkout endpoint) runs
  - **Then** a Stripe Customer is created first, `RECIPIENT.stripeCustomerId` is persisted, and the Checkout Session is attached to that customer

- [ ] **Scenario:** Subsequent card checkouts reuse the registered customer
  - **Given** `RECIPIENT.stripeCustomerId` is already set from a prior checkout
  - **When** I initiate another Stripe checkout — for a new order or a Premium subscription
  - **Then** no new Stripe Customer is created; the existing `stripeCustomerId` is reused, and I am not asked to re-enter payment details Stripe already has on file

- [ ] **Scenario:** Card capture only appears inside a card checkout flow
  - **Given** I am registering (A1) or paying entirely by cash-on-delivery
  - **When** I go through those flows
  - **Then** I am never prompted for card details — card capture is deferred until the first time I actively choose "Pay by card"

- [ ] **Scenario:** `hasStripeCard` reflects registration without exposing the raw ID
  - **Given** I have completed at least one card checkout
  - **When** the client reads my `RecipientDTO`
  - **Then** `hasStripeCard: true` is present, but the raw `stripeCustomerId` is never sent to the client

## Implementation Flow

1. **Don't build a standalone "add card" screen.** Card registration only ever happens as a side effect of the first real `POST /orders/:id/checkout-session` (or subscription checkout) call — the trigger is D2's "Pay by card" choice, not a dedicated settings page.
2. **The customer-creation check (`stripeCustomerId` unset → create) happens server-side inside the checkout-session endpoint**, not as a separate client-initiated step. The frontend doesn't need to know or care whether this is the Recipient's first card checkout — it just calls the same endpoint every time.
3. **Render UI state off `RecipientDTO.hasStripeCard`, never off a raw Stripe ID** — the backend deliberately never sends `stripeCustomerId` to the client; use the derived boolean to decide messaging like "using your saved card" vs. first-time framing.
4. **Reuse this same registration across order checkout and Premium subscription checkout (F1).** Don't implement a second, parallel Stripe-Customer-creation path for subscriptions — both flows must converge on the one `stripeCustomerId` per Recipient.
5. **After the Checkout Session redirect, there is nothing further for this story to do client-side** — Stripe hosts the actual card-entry form. This story's scope ends at "customer created/reused, session created," not at rendering payment fields.

## Related Epic
Recipient Food Ordering (Epic D — #84)
