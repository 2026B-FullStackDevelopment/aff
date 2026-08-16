---
title: "[STORY][DONOR] Pause / Resume / Cancel Listing"
labels: user-story
---

**Traceability:** PRD `C5` (SRS `4.2.3`) · API: `PATCH /listings/:id/status` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **pause, resume, or cancel one of my active listings**
so that **I can control its availability as my actual supply changes**.

## Acceptance Criteria

- [ ] **Scenario:** Pause an active listing
  - **Given** I own a listing with `status=ACTIVE`
  - **When** I set its status to `PAUSED`
  - **Then** `PATCH /listings/:id/status` updates `LISTING.status=PAUSED`, and it no longer appears in public browsing

- [ ] **Scenario:** Resume a paused listing
  - **Given** I own a listing with `status=PAUSED`
  - **When** I set its status back to `ACTIVE`
  - **Then** `PATCH /listings/:id/status` updates `LISTING.status=ACTIVE`, and it becomes visible in public browsing again

- [ ] **Scenario:** Cancel shows a confirmation naming affected pending orders
  - **Given** I own a listing with one or more orders still `AWAITING_COURIER`
  - **When** I choose to cancel the listing
  - **Then** I see a confirmation dialog stating how many pending orders will be auto-cancelled before I confirm

- [ ] **Scenario:** Cancelling cascades only to unclaimed orders
  - **Given** I own a listing with some orders `AWAITING_COURIER` (or with no `DELIVERY` record yet) and some already `ASSIGNED` or later
  - **When** I confirm cancellation via `PATCH /listings/:id/status` (`status=CANCELLED`)
  - **Then** `LISTING.status=CANCELLED`, every `AWAITING_COURIER`-or-no-delivery order is set to `orderStatus=CANCELLED` with `cancelledByUserId=<my userId>`, and orders already `ASSIGNED` or later are left untouched
  - **and** the response includes `cancelledOrderCount` matching the number of orders that were cascaded

- [ ] **Scenario:** Re-cancelling an already-cancelled listing is rejected
  - **Given** I own a listing with `status=CANCELLED`
  - **When** I attempt to cancel it again
  - **Then** `PATCH /listings/:id/status` rejects the request with `409`

## Implementation Flow

1. **Pause and Resume are immediate, no-confirmation actions** — call `PATCH /listings/:id/status` with `PAUSED`/`ACTIVE` directly. Only Cancel needs a confirmation step.
2. **The cancel confirmation dialog must state the real pending-order count before the Donor commits** — source that count from the listing's current orders (already available from C8/C4 data), not a placeholder like "some orders."
3. **Only call `PATCH /listings/:id/status` with `CANCELLED` after the Donor confirms.** Use the response's `cancelledOrderCount` for the final result toast — it's the authoritative number, even though it should match the pre-cancel estimate.
4. **Treat a `409` (already cancelled) as a stale-state signal**, not a raw error: refetch the listing and show its real current status rather than surfacing the HTTP error directly.

## Related Epic
Donor Food Donation Management (Epic C — #66)
