---
title: "[STORY][SYSTEM] Single Delivery Entry Point"
labels: user-story
---

**Traceability:** PRD `E12` (new) · API: internal `DeliveryService.createForOrder(orderId)` (`docs/api_design.md` §9) — not exposed to the frontend

## User Story
As the **Delivery module**,
I expose **one `createForOrder(orderId, ...)` entry point for queue-eligible Reservation Orders**
so that **every Courier delivery enters the same pipeline while completed in-person flows remain outside it**.

## Acceptance Criteria

- [ ] **Scenario:** Reservation flow calls the shared entry point
  - **Given** a free or cash Reservation order is created (D2), or a Stripe Reservation order's payment is confirmed via webhook (§8)
  - **When** the order becomes payable-complete (immediately for free/cash, on webhook success for Stripe)
  - **Then** `DeliveryService.createForOrder(orderId)` is called, creating a `DELIVERY` (`stage=AWAITING_COURIER`) referencing that `orderId`

- [ ] **Scenario:** Donor-initiated manual donation does not enter the queue
  - **Given** a free or priced Donor-initiated manual donation is recorded (C3)
  - **When** its terminal `ORDER` is created with `orderStatus=DELIVERED`
  - **Then** `DeliveryService.createForOrder(orderId)` is not called and no `DELIVERY` is created

- [ ] **Scenario:** No delivery is created for Per-Request listings
  - **Given** a Per-Request listing exists
  - **When** Recipients self-collect from it
  - **Then** `createForOrder` is never invoked, because no `ORDER` is ever created for Per-Request listings in the first place (C7)

- [ ] **Scenario:** The interface is internal, not a REST endpoint
  - **Given** the Delivery module's public surface (`docs/api_design.md` §9)
  - **When** comparing it against this entry point
  - **Then** `createForOrder` is not among the exposed `/api/deliveries/*` routes — it's called module-to-module (Orders/Listings service → Delivery service interface), per the architecture's cross-module service-interface rule (`A.3.1`)

- [ ] **Scenario:** Idempotent against duplicate calls for the same order
  - **Given** `createForOrder(orderId)` has already succeeded for a given order
  - **When** it is somehow invoked again for the same `orderId` (e.g. a retried webhook)
  - **Then** it does not create a second `DELIVERY` record for that order

## Implementation Flow

1. **Build this as a plain internal function/service method on the Delivery module, exposed via its `*.interface.ts`** — per the architecture's cross-module rule (`A.3.1`), the Orders module calls `DeliveryService.createForOrder` directly through that interface, never through an HTTP round-trip to the Delivery module's own routes.
2. **Route every Reservation "becomes queue-eligible" moment through this function**, rather than writing a `DELIVERY` document directly: D2's free/cash Reservation path and the Stripe webhook's successful Reservation-payment handler call the same interface.
3. **Guard against duplicate creation** — key the idempotency check on `orderId` (e.g. a unique index on `DELIVERY.orderId`, or an existence check before insert) since at least one caller (the Stripe webhook) is explicitly at-least-once delivery per §8's idempotency note.
4. **Validate delivery eligibility defensively.** The referenced Order must use `intakePath=RESERVATION` and be in a queue-eligible state. Reject or safely ignore `DONOR_INITIATED` Orders so a future caller cannot accidentally queue an in-person donation.
5. **Keep the created `DELIVERY` minimal and consistent regardless of Reservation payment method**: `orderId` set, `stage=AWAITING_COURIER`, `courierId` unset, `createdAt=now`.
6. **Test the boundary explicitly.** Cover free, cash, and webhook-confirmed Stripe Reservations, duplicate calls, and the rule that Donor-initiated manual Orders never create a Delivery.
7. **This story should land before — or alongside — D2.** It is the structural prerequisite for Reservation delivery and most of Epic E.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
