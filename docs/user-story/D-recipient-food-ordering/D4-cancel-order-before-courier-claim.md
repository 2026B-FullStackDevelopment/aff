---
title: "[STORY][RECIPIENT] Cancel Order Before Courier Claim"
labels: user-story
---

**Traceability:** PRD `D4` (revised — Stripe refund on cancellation is now automatic) · API: `DELETE /orders/:id` (`docs/api_design.md` §7), `charge.refunded` webhook (§8), `payment:refunded` event (§12)

## User Story
As a **Recipient**,
I can **cancel my order while it's still waiting for a Courier to claim it**
so that **I'm not locked into a mistaken purchase just because I've already placed it**.

## Acceptance Criteria

- [ ] **Scenario:** Successful cancellation before claim
  - **Given** my order's delivery has no `DELIVERY` record yet, or has one with `stage=AWAITING_COURIER`
  - **When** I call `DELETE /orders/:id`
  - **Then** `ORDER.orderStatus=CANCELLED`, `cancelledByUserId` is set to my own user ID, `cancelledAt` is set, and `LISTING.quantityRemaining` is restored

- [ ] **Scenario:** Cancellation blocked once claimed
  - **Given** my order's delivery has `stage=ASSIGNED`, `PICKED_UP`, or `DELIVERED`
  - **When** I call `DELETE /orders/:id`
  - **Then** the request is rejected with `409` ("This order can no longer be cancelled"), and the order is untouched

- [ ] **Scenario:** Cancel button visibility is set from the page's own data load
  - **Given** I open my order detail page
  - **When** the page fetches the order's current `delivery.stage`
  - **Then** the "Cancel Order" button is shown or hidden based on that snapshot — no live subscription is needed; if a Courier claims the order later while I'm still on the page, the button doesn't need to disappear on its own (the `409` fallback below covers that race)

- [ ] **Scenario:** Cannot cancel another Recipient's order
  - **Given** an order exists that isn't mine
  - **When** I call `DELETE /orders/:id` on its ID
  - **Then** the request is rejected — ownership is enforced, not just delivery stage

- [ ] **Scenario:** Cancelling a Stripe-paid order automatically starts a refund
  - **Given** my cancelled order has `paymentMethod=STRIPE` and `paymentStatus=PAID`
  - **When** the cancellation succeeds
  - **Then** the response includes `refundStatus: 'REFUND_PENDING'`, and server-side a synchronous `stripe.refunds.create()` call has already been made against `PAYMENT.stripePaymentIntentId` — I don't need to take any further action to get my money back

- [ ] **Scenario:** Refund confirmation arrives live
  - **Given** my cancellation just returned `refundStatus: 'REFUND_PENDING'` and I'm still on the order page
  - **When** the `charge.refunded` webhook later confirms the refund
  - **Then** a `payment:refunded` event updates my view to `REFUNDED` without a page reload, matching `ORDER.paymentStatus`/`PAYMENT.status` server-side

- [ ] **Scenario:** A failed refund attempt doesn't block cancellation
  - **Given** my order is Stripe-paid and eligible to cancel, but the Stripe refund API call itself errors (e.g. Stripe outage)
  - **When** I call `DELETE /orders/:id`
  - **Then** the order is still cancelled — `orderStatus=CANCELLED`, `quantityRemaining` restored — and the response reports `refundStatus: 'FAILED'` rather than blocking or rolling back the cancellation

- [ ] **Scenario:** Non-Stripe or unpaid orders skip the refund entirely
  - **Given** my cancelled order was free, cash-on-delivery, or a Stripe order still `PAYMENT_PENDING` (checkout never completed)
  - **When** the cancellation succeeds
  - **Then** the response reports `refundStatus: 'NOT_APPLICABLE'`, and no Stripe API call is made

## Implementation Flow

1. **Show the "Cancel Order" button purely off `delivery.stage` in the current `OrderDTO`/`DeliveryDTO` read** — `null` or `AWAITING_COURIER` shows it, anything else hides it. Don't try to predict eligibility from `orderStatus` alone; the delivery stage is the actual gate.
2. **The cancel action itself has no confirmation-dependent client logic beyond a simple "are you sure" prompt** — the real correctness guarantee is server-side: `DELETE /orders/:id` performs the stage check and the cancellation atomically, so there's no read-then-write race to protect against on the client.
3. **On `409`, don't treat it as a generic error.** It means a Courier won the claim race in the moment between page load and the cancel click — refresh the order's delivery state from the server response and hide the cancel button; message it as "a Courier just picked this up," not a retry-able failure. This is the only mechanism needed for the claim-while-viewing race — no live subscription required; the race window is just the moment between page load and the click, and the `409` handles it cleanly.
4. **Render `refundStatus` from the cancel response, and keep listening after that.** `NOT_APPLICABLE` needs no further UI. `REFUND_PENDING` should show a clear "refund in progress" state — this is not the final word, don't present it as done. `FAILED` should read as "cancelled, but the refund needs attention" rather than a cancellation failure (the order *is* cancelled either way).
5. **Subscribe to `payment:refunded` the same way E8 subscribes to `order:status_changed`** — via the personal `user:<userId>` room, already joined at session start; match on `orderId` in the payload and flip that order's local `refundStatus`/`paymentStatus` to `REFUNDED` without refetching. There is deliberately no equivalent live event for `FAILED` — a failed refund *attempt* is synchronous and already known from the cancel response itself; nothing async is being waited on in that case.
6. **Don't build any refund-retry or dispute UI for the `FAILED` case.** Per Epic D's Out of Scope, that remains a manual/unaddressed edge case — this story's job is surfacing the state clearly, not resolving it.

## Related Epic
Recipient Food Ordering (Epic D)
