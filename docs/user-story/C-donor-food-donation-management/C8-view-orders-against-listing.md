---
title: "[STORY][DONOR] View Orders Against a Listing"
labels: user-story
---

**Traceability:** PRD `C8` (SRS `4.2.5`, status vocabulary aligned to schema) · API: `GET /listings/:id/orders` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **see every tracked order against one of my listings — Recipient, quantity, delivery status, payment info, and feedback**
so that **I can follow up on and understand the outcome of each donation I've made**.

## Acceptance Criteria

- [ ] **Scenario:** Viewing tracked orders on a listing
  - **Given** I own a listing with one or more Reservation and/or Donor-initiated orders against it
  - **When** I call `GET /listings/:id/orders`
  - **Then** I see a paginated table of orders, each showing the Recipient's username, `quantity`, `orderStatus`, `paymentMethod`/`paymentStatus`, and any `feedback`

- [ ] **Scenario:** Per-Request listings have nothing to show
  - **Given** I own a listing with `unit=PER_REQUEST`
  - **When** I call `GET /listings/:id/orders`
  - **Then** the response is an empty list, since Per-Request listings never produce orders

- [ ] **Scenario:** Cannot view orders on another Donor's listing
  - **Given** a listing exists that does not belong to me
  - **When** I attempt `GET /listings/:id/orders` on that listing's ID
  - **Then** the request is rejected with `403`

- [ ] **Scenario:** Payment info is read directly from the order
  - **Given** a listed order was paid by cash
  - **When** I view that order's row
  - **Then** `paymentMethod`/`paymentStatus` display correctly even though cash orders never have a `PAYMENT` record — this data is read directly off `OrderDTO`, not joined from `PAYMENT`

## Implementation Flow

1. **This is a read-only view.** Fetch via `GET /listings/:id/orders` and render — there's no mutation in this story.
2. **Use the response's pagination fields** the same way as C4's listing search, rather than loading every order for a listing at once.
3. **Render `feedback` only when present** (it's nullable) — don't show an empty feedback row/placeholder for orders that haven't been reviewed yet.
4. **On `403` (viewing another Donor's listing), route back to the Donor's own listings view** rather than rendering a blank or broken table.

## Related Epic
Donor Food Donation Management (Epic C — #66)
