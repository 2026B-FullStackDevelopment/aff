---
title: "[STORY][RECIPIENT] Feedback on Delivered Order"
labels: user-story
---

**Traceability:** PRD `D7` (SRS `5.2.4`) · API: `POST /orders/:id/feedback` (`docs/api_design.md` §7)

## User Story
As a **Recipient**,
I can **leave feedback on an order once it's been delivered**
so that **the Donor gets visibility into how the donation actually landed**.

## Acceptance Criteria

- [ ] **Scenario:** Feedback form appears only after delivery
  - **Given** I am viewing one of my orders with `orderStatus != DELIVERED`
  - **When** the order detail page renders
  - **Then** no feedback form is shown

- [ ] **Scenario:** Successful feedback submission
  - **Given** my order has `orderStatus=DELIVERED` and I haven't submitted feedback yet
  - **When** I submit a comment via `POST /orders/:id/feedback`
  - **Then** the order's `feedback` (comment, createdAt) is persisted, and the Donor can see it via C8 (View Orders Against a Listing)

- [ ] **Scenario:** Feedback is one-per-order
  - **Given** I've already submitted feedback on this order
  - **When** I attempt to submit again
  - **Then** the request is rejected with `409`, and I see my existing feedback rather than an empty form

- [ ] **Scenario:** Feedback blocked before delivery
  - **Given** my order's `orderStatus` is anything other than `DELIVERED`
  - **When** I attempt `POST /orders/:id/feedback` directly (bypassing the UI gate)
  - **Then** the request is rejected with `409`

- [ ] **Scenario:** Cannot submit feedback on another Recipient's order
  - **Given** an order exists that isn't mine
  - **When** I call `POST /orders/:id/feedback` on its ID
  - **Then** the request is rejected — ownership is enforced

## Implementation Flow

1. **Gate the form's visibility on `orderStatus === 'DELIVERED'` read from D5's order data** — no separate fetch needed just to check eligibility.
2. **Once feedback exists on the order (non-null `feedback` in the response), render it read-only instead of an editable form** — feedback is one-shot per order; don't build an edit/update path since the API has none.
3. **On successful submission, update local order state from the response's `feedback` object directly** rather than re-fetching the whole order — the `201` response already returns exactly what was persisted.
4. **Treat `409` distinctly depending on cause where you can tell**: "already submitted" (show existing feedback) vs. "not yet delivered" (hide the form, shouldn't normally be reachable since the UI already gates on `DELIVERED`, but don't assume the gate is unbeatable — handle the server rejection gracefully regardless).
5. **This story only covers the Recipient's submission side.** The Donor-facing display of feedback is already part of C8's `GET /listings/:id/orders` response — don't duplicate that rendering logic here.

## Related Epic
Recipient Food Ordering (Epic D)
