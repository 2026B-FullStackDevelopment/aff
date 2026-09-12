---
title: "[STORY][ADMIN] Cancel Any Active Listing"
labels: user-story
---

**Traceability:** PRD `G3` (SRS `7.2.2`) · API: `PATCH /admin/listings/:id/cancel` (`docs/api_design.md` §11) · same cascade rule as C5 (`PATCH /listings/:id/status`)

## User Story
As an **Admin**,
I can **cancel any active listing, hiding it and blocking new orders**
so that **I can pull unsafe, fraudulent, or policy-violating food off the marketplace immediately**.

## Acceptance Criteria

- [ ] **Scenario:** Cancelling a listing
  - **Given** an `ACTIVE` (or `PAUSED`) listing
  - **When** I call `PATCH /admin/listings/:id/cancel`
  - **Then** `LISTING.status` becomes `CANCELLED`, it no longer appears in the public `GET /listings`, and no new orders can be placed against it

- [ ] **Scenario:** Cascade cancels only unclaimed orders
  - **Given** the listing has orders in a mix of states
  - **When** I cancel the listing
  - **Then** only orders whose delivery is still `AWAITING_COURIER` (or which have no `DELIVERY` record yet) are auto-cancelled, each with `cancelledByUserId` set to my Admin `userId`

- [ ] **Scenario:** Claimed orders are protected
  - **Given** an order on the listing whose delivery is `ASSIGNED`, `PICKED_UP`, or `DELIVERED`
  - **When** I cancel the listing
  - **Then** that order is left untouched — the cascade never cancels a claimed delivery

- [ ] **Scenario:** Response reports the cascade size
  - **Given** the cancel succeeds
  - **When** I read the response
  - **Then** it returns `{ listing: ListingDTO, cancelledOrderCount: number }`

- [ ] **Scenario:** Affected Recipients are notified live
  - **Given** Recipients had auto-cancelled orders on the listing
  - **When** the cascade runs
  - **Then** each receives a `notification:admin_cancel` event (see G5)

- [ ] **Scenario:** Non-Admin is rejected
  - **Given** I am not an Admin
  - **When** I call `PATCH /admin/listings/:id/cancel`
  - **Then** the request is rejected

## Implementation Flow

1. **Share one cascade implementation with C5** (`PATCH /listings/:id/status` → `CANCELLED`). The auto-cancel predicate (`DELIVERY.stage = AWAITING_COURIER` OR no `DELIVERY` row) and the `cancelledByUserId` stamping are identical; only the actor's `userId` differs. Do not write a second copy.
2. **Do it in one transaction** — set `LISTING.status=CANCELLED`, select the still-cancellable orders, cancel them, count them, and (G5) emit one event per affected Recipient. `cancelledOrderCount` is that count.
3. **The claimed-order cutoff is the same atomic condition as E3/D4** — an order can only be cancelled while unclaimed. Rely on the `DELIVERY.stage` check, consistent with the rest of the pipeline.
4. **Admin can cancel from any non-terminal status** (`ACTIVE`, `PAUSED`); cancelling an already-`CANCELLED` or `SOLD_OUT` listing is a no-op or `409` — align with C5's behavior.
5. **UI: a cancel action in G4's admin listings table** with the same cascade confirmation copy C5 uses ("N pending order(s) will be cancelled").
6. **Blocked** on the C1 listings/orders schema rebuild and the not-yet-built Delivery module (the cascade reads `DELIVERY.stage`) — `docs/blockers.md`, G3 🔴.

## Related Epic
Admin Functionality (Epic G — #124)
