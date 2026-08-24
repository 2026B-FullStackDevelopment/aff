---
title: "[STORY][SYSTEM] Single Delivery Entry Point"
labels: user-story
---

**Traceability:** PRD `E12` (new) · API: internal `DeliveryService.createForOrder(orderId)` (`docs/api_design.md` §9) — not exposed to the frontend

## User Story
As the **Delivery module**,
I expose **one `createForOrder(orderId, ...)` entry point, called identically by the Reservation and Donor-initiated flows**
so that **both intake paths converge on the same Courier pipeline with no divergent logic between them**.

## Acceptance Criteria

- [ ] **Scenario:** Reservation flow calls the shared entry point
  - **Given** a free or cash Reservation order is created (D2), or a Stripe Reservation order's payment is confirmed via webhook (§8)
  - **When** the order becomes payable-complete (immediately for free/cash, on webhook success for Stripe)
  - **Then** `DeliveryService.createForOrder(orderId)` is called, creating a `DELIVERY` (`stage=AWAITING_COURIER`) referencing that `orderId`

- [ ] **Scenario:** Donor-initiated flow calls the same entry point
  - **Given** a free or paid Donor-initiated donation is created (C3)
  - **When** the order becomes payable-complete (immediately for free, on payment confirmation for priced)
  - **Then** the identical `DeliveryService.createForOrder(orderId)` call fires — not a separate Donor-initiated-specific delivery-creation path

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

1. **Build this as a plain internal function/service method on the Delivery module, exposed via its `*.interface.ts`** — per the architecture's cross-module rule (`A.3.1`), the Orders and Listings services call `DeliveryService.createForOrder` directly through that interface, never through an HTTP round-trip to the Delivery module's own routes.
2. **This is the one function every other "order becomes queue-eligible" moment must route through**, rather than each caller writing its own `DELIVERY` document directly: D2's free/cash reservation path, the Stripe webhook's `checkout.session.completed` handler (§8), and C3's free/priced donor-initiated donation path all call this same function. When implementing any of those stories, resist writing an inline `Delivery.create(...)` — call this interface instead.
3. **Guard against duplicate creation** — key the idempotency check on `orderId` (e.g. a unique index on `DELIVERY.orderId`, or an existence check before insert) since at least one caller (the Stripe webhook) is explicitly at-least-once delivery per §8's idempotency note.
4. **Keep the created `DELIVERY` minimal and consistent regardless of caller**: `orderId` set, `stage=AWAITING_COURIER`, `courierId` unset, `createdAt=now` — no intake-path-specific branching inside this function. If a caller needs different behavior, that belongs in the caller, not as a parameter that forks this function's logic.
5. **This story should land before — or alongside — the first story that needs to call it (C3 or D2).** Per `docs/blockers.md`, it's the structural prerequisite for most of Epic E and for C3/D2; sequence it early rather than stubbing it out to unblock those stories first.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
