---
title: "[STORY][COURIER] Shared Oldest-First Queue"
labels: user-story
---

**Traceability:** PRD `E2` (new) · API: `GET /deliveries/queue` (`docs/api_design.md` §9)

> **Amended 2026-08-30:** queue order is `DELIVERY.createdAt` (when the Order
> became claimable), not `ORDER.createdAt` (when it was placed). The two
> diverge because Stripe Orders enter the queue on webhook confirmation and
> donor-initiated priced Orders on the Recipient's payment choice. Sorting by
> claimability stops an Order that sat for hours awaiting payment from jumping
> ahead of one placed recently and paid at once. See
> `docs/superpowers/specs/2026-08-30-courier-core-backend-design.md` D1.

## User Story
As a **Courier**,
I can **see a shared, oldest-first queue of unclaimed orders from both tracked intake paths**
so that **I always work the longest-waiting order first, with no separate queues per path to check**.

## Acceptance Criteria

- [ ] **Scenario:** Queue shows only unclaimed deliveries
  - **Given** deliveries exist across `AWAITING_COURIER`, `ASSIGNED`, `PICKED_UP`, and `DELIVERED` stages
  - **When** I call `GET /deliveries/queue`
  - **Then** only `stage=AWAITING_COURIER` deliveries are returned

- [ ] **Scenario:** Queue is sorted oldest-first, not client-selectable
  - **Given** multiple unclaimed deliveries exist with different `DELIVERY.createdAt` values
  - **When** I load the queue
  - **Then** they are sorted by `DELIVERY.createdAt` ascending, and there is no client-side control to change that ordering

- [ ] **Scenario:** Queue merges both intake paths into one list
  - **Given** unclaimed orders exist from both `RESERVATION` and `DONOR_INITIATED` intake paths
  - **When** I load the queue
  - **Then** both appear interleaved by age in the same list — not as two separate sections

- [ ] **Scenario:** Each queue row shows enough to decide whether to claim
  - **Given** a queue entry
  - **When** it renders
  - **Then** it includes the listing name (`listing.name`), the order's quantity, the Donor's company name, the pickup address (`pickupAddressText`), and the delivery address text — so the Courier can see what the load is and weigh the collection point against the drop-off before claiming

- [ ] **Scenario:** Listing name, company name and pickup address on a queue row cost no extra query
  - **Given** a page of queue entries
  - **When** the server hydrates them
  - **Then** `listing.name`, `companyName`, and `pickupAddressText`/`pickupAddressLocation` all come from one bulk Listing→Donor join — not a per-row lookup — and a row whose Listing/Donor could not be loaded is still listed, with `listing.name`/`companyName` null and the pickup fields absent

- [ ] **Scenario:** Only Couriers can view the queue
  - **Given** I am logged in as a non-Courier role
  - **When** I attempt `GET /deliveries/queue`
  - **Then** the request is rejected

## Implementation Flow

1. **Don't add client-side sort controls to this view** — the API design fixes the ordering server-side (oldest-first by `DELIVERY.createdAt`) precisely so no Courier can "cherry-pick" out of order; the UI should reflect that constraint, not work around it.
2. **Render straight from each `DeliveryDTO` plus its denormalized `order`/`listing`/`donor` fields** in the response — no extra per-row fetch to show listing name, quantity, pickup/delivery address, or Donor name. The pickup address here is the same `pickupAddressText`/`pickupAddressLocation` the Courier keeps seeing post-claim (E5); it is not a separate concept.
3. **Drive pagination from the response's `page`/`limit`/`total`**, same pattern as C4/D1 — don't fetch the whole queue up front.
4. **This view should refresh when a delivery is claimed (by this Courier or another).** Since claims can come from any Courier, consider polling or re-fetching the queue after this Courier's own claim action (E3) resolves at minimum; the PRD doesn't specify a live "someone else claimed this" push for the queue itself, so don't over-build a socket subscription this story doesn't call for.
5. **Each row's "Claim" action belongs to E3, not this story.** This story is the read-only queue surface; wire the claim button here but treat its behavior as E3's scope.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
