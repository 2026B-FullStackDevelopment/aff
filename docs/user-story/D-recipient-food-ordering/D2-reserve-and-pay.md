---
title: "[STORY][RECIPIENT] Reserve & Pay"
labels: user-story
---

**Traceability:** PRD `D2` (SRS `5.1.2`, `5.1.3`, `5.2.3`, revised per PRD §10) · API: `POST /listings/:id/reserve`, `POST /orders/:id/checkout-session` (`docs/api_design.md` §6, §7)

## User Story
As a **Recipient**,
I can **reserve an active listing and choose how to pay**
so that **my order enters the delivery queue without me having to arrange pickup myself**.

## Acceptance Criteria

- [ ] **Scenario:** Successful reservation on a free listing
  - **Given** a listing is `ACTIVE`, not `PER_REQUEST`, has `price=0`, and sufficient `quantityRemaining`, and I have no existing non-cancelled order on it
  - **When** I submit a reservation with quantity and delivery address
  - **Then** `POST /listings/:id/reserve` creates an `ORDER` (`intakePath=RESERVATION`, `paymentStatus=FREE`, `orderStatus=PREPARING`), decrements `LISTING.quantityRemaining`, and `DeliveryService.createForOrder` fires immediately

- [ ] **Scenario:** Successful reservation paid by cash-on-delivery
  - **Given** a listing is `ACTIVE` with `price > 0` and I pass all eligibility checks
  - **When** I submit a reservation with `paymentMethod: 'CASH'`
  - **Then** the order is created with `paymentStatus=PAYMENT_PENDING`, `orderStatus=PREPARING`, and it enters the Courier queue immediately — cash orders don't wait for payment to be collected before joining the queue; `orderStatus=PREPARING` reflects that it's already in the pipeline even though payment isn't settled

- [ ] **Scenario:** Successful reservation paid by Stripe
  - **Given** a listing is `ACTIVE` with `price > 0` and I pass all eligibility checks
  - **When** I submit a reservation with `paymentMethod: 'STRIPE'`
  - **Then** the order is created with `paymentStatus=PAYMENT_PENDING`, `orderStatus=PENDING_PAYMENT`, and **no** `DELIVERY` record is created yet — I must complete `POST /orders/:id/checkout-session` before the order enters the queue

- [ ] **Scenario:** Reservation blocked — listing not eligible
  - **Given** a listing is `PAUSED`, `CANCELLED`, `SOLD_OUT`, or `unit=PER_REQUEST`
  - **When** I attempt to reserve it
  - **Then** `POST /listings/:id/reserve` rejects with `422`, and no order is created

- [ ] **Scenario:** Reservation blocked — quantity exceeds stock or ration limit
  - **Given** a listing has `quantityRemaining` or `rationLimitPerPerson` lower than my requested quantity
  - **When** I submit that quantity
  - **Then** the request is rejected with `422`

- [ ] **Scenario:** One reservation per listing per Recipient
  - **Given** I already have a non-cancelled order against this listing
  - **When** I attempt to reserve it again
  - **Then** the request is rejected with `422`

- [ ] **Scenario:** Missing payment method on a priced listing
  - **Given** a listing has `price > 0`
  - **When** I submit a reservation without `paymentMethod`
  - **Then** the request is rejected with `400`

## Implementation Flow

1. **Gate the reserve action client-side on the same eligibility rules the server enforces** (active, not Per-Request, quantity ≤ remaining and ≤ ration limit, no existing order) purely for fast UX feedback — the server re-checks all of them atomically and is the actual source of truth; don't skip the server-side checks because the UI already validated.
2. **Collect `deliveryAddressText` + `deliveryLocation` and, if `price > 0`, `paymentMethod` in the same reservation form** — there's no separate address step after the order is created.
3. **Branch the post-submit flow on `orderStatus` in the response, not on `paymentMethod` alone:**
   - `orderStatus=PREPARING` (free, or cash with `paymentStatus=PAYMENT_PENDING`) → the order already exists and is queued; show it as confirmed/in the pipeline.
   - `orderStatus=PENDING_PAYMENT` (Stripe) → immediately call `POST /orders/:id/checkout-session` and redirect the browser to the returned `checkoutUrl`. Don't show this order as confirmed yet — it isn't in the delivery queue until the Stripe webhook confirms payment (§8) and flips it to `PREPARING`. Note `orderStatus` never advances further than `PREPARING` from here on this order — once picked up/delivered, progress is tracked on `DELIVERY.stage`, not `orderStatus` (see E8).
4. **Don't try to detect Stripe payment success client-side.** The checkout redirect leaves your app; confirmation arrives asynchronously via the `payment:success` Socket.IO event (§12) or by the Recipient revisiting D5's order history after returning from Stripe.
5. **Surface `422`s as field-specific inline errors** (quantity vs. stock, quantity vs. ration limit, listing not eligible, duplicate reservation) rather than one generic failure banner — each maps to a different user-facing message.
6. **First-time Stripe card capture is D3's responsibility, not this story's.** This story only triggers the checkout-session call; the actual card-entry UI and `stripeCustomerId` registration live in D3.

## Related Epic
Recipient Food Ordering (Epic D — #84)
