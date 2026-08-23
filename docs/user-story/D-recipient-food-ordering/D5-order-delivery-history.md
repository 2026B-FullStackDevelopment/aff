---
title: "[STORY][RECIPIENT] Order/Delivery History"
labels: user-story
---

**Traceability:** PRD `D5` (SRS `5.1.4`, relabeled) · API: `GET /orders/mine` (`docs/api_design.md` §7)

## User Story
As a **Recipient**,
I can **view my past orders and their delivery status**
so that **I can track everything I've ordered without cross-referencing separate listing and delivery pages**.

## Acceptance Criteria

- [ ] **Scenario:** History lists all of my orders
  - **Given** I have placed multiple orders across different listings and statuses
  - **When** I call `GET /orders/mine`
  - **Then** every order I've placed is returned, each showing the donation (listing), Donor, quantity, price paid, payment method, delivery status, and date

- [ ] **Scenario:** Only my own orders are ever returned
  - **Given** other Recipients have their own orders
  - **When** I call `GET /orders/mine`
  - **Then** results are always implicitly scoped to `recipientId = <my user ID>` — there is no parameter to query anyone else's orders

- [ ] **Scenario:** Delivery status reflects live stage, not just order status
  - **Given** one of my orders has an associated `DELIVERY` record
  - **When** I view it in my history
  - **Then** the delivery's `stage` (e.g. `ASSIGNED`, `PICKED_UP`, `DELIVERED`) is shown, not only the coarser `orderStatus`

- [ ] **Scenario:** Orders with no delivery yet still appear
  - **Given** I have a Stripe order still in `orderStatus=PENDING_PAYMENT` with no `DELIVERY` record
  - **When** I view my history
  - **Then** it still appears, showing a "delivery: null" / not-yet-queued state rather than being hidden or erroring

- [ ] **Scenario:** Paginated results
  - **Given** I have more orders than fit on one page
  - **When** I page through history
  - **Then** the client requests subsequent pages via the response's `page`/`limit`/`total`

## Implementation Flow

1. **Call `GET /orders/mine` with pagination only** — there's no search/filter/sort on this endpoint per the API design; don't build filter UI against it that the backend can't actually serve.
2. **Render `delivery: { stage } | null` directly from the response** rather than deriving delivery state from `orderStatus` — the two are related but not identical (e.g. a `PENDING_PAYMENT` Stripe order has no delivery yet at all).
3. **Sort newest-first by default** (`createdAt` descending) since this is a history view — confirm the actual default sort against the endpoint before assuming, since the API design doesn't specify client-controlled sort here.
4. **Link each row through to the order's detail view**, which is where D4's cancel action and D7's feedback form live — this story is the list surface only, not the per-order actions.
5. **This endpoint returns `donor: { id, companyName }`** — use it directly for the Donor column; don't make a second call per row to fetch Donor details.

## Related Epic
Recipient Food Ordering (Epic D)
