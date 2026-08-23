---
title: "[STORY][COURIER] Complete Delivery (with Cash Confirmation)"
labels: user-story
---

**Traceability:** PRD `E7` (new) · API: `PATCH /deliveries/:id/deliver` (`docs/api_design.md` §9)

## User Story
As a **Courier**,
I can **tap "Delivered" as the final action on a delivery, confirming cash received first if the order is cash-paid**
so that **the delivery is marked complete and, for cash orders, the payment record is closed out at the same moment**.

## Acceptance Criteria

- [ ] **Scenario:** Successful delivery completion on a non-cash order
  - **Given** my delivery is `stage=PICKED_UP` and the order's `paymentMethod != CASH`
  - **When** I tap "Delivered" and call `PATCH /deliveries/:id/deliver`
  - **Then** `DELIVERY.stage=DELIVERED`, `deliveredAt=now`, and `ORDER.orderStatus=DELIVERED`

- [ ] **Scenario:** Cash confirmation required before completing a cash order
  - **Given** my delivery is `stage=PICKED_UP` and the order's `paymentMethod=CASH`
  - **When** I attempt to tap "Delivered" without checking "Cash received — exact amount, no change given" first
  - **Then** the UI blocks submission, and if attempted anyway, `PATCH /deliveries/:id/deliver` without `cashConfirmed: true` is rejected with `400`

- [ ] **Scenario:** Cash confirmation flips payment status
  - **Given** my delivery is `stage=PICKED_UP` on a cash order
  - **When** I submit `{ cashConfirmed: true }`
  - **Then** `DELIVERY.stage=DELIVERED`, `ORDER.orderStatus=DELIVERED`, `ORDER.paymentStatus` flips from `PAYMENT_PENDING` to `PAID`, and `{ courierId, confirmedAt }` is logged on the order for basic traceability

- [ ] **Scenario:** Completion rejected from the wrong stage
  - **Given** my delivery is not currently `PICKED_UP`
  - **When** I attempt `PATCH /deliveries/:id/deliver`
  - **Then** the request is rejected with `409`

- [ ] **Scenario:** This is the terminal action — no undo
  - **Given** my delivery has reached `stage=DELIVERED`
  - **When** I look for a way to revert or redo the delivery
  - **Then** none exists — `DELIVERED` is sole-source-of-truth terminal, with no Recipient confirmation step and no delivery-failure/redo path

## Implementation Flow

1. **Branch the "Delivered" button's behavior on the order's `paymentMethod`, read from the delivery/order data already loaded** — cash orders show the confirmation checkbox gate first; non-cash orders can submit directly.
2. **The checkbox text must match the SRS-mandated cash rule exactly: "exact amount, no change given."** This isn't cosmetic — it's the bright-line rule the team deliberately kept simple (PRD §9) rather than modeling partial payments or disputes; don't soften or generalize the wording.
3. **Client-side, disable the "Delivered" submit button until the cash checkbox is checked (for cash orders only)** — this is a UX safeguard; the actual enforcement is still server-side (`400` on missing `cashConfirmed: true`), so don't skip sending it correctly even though the UI also gates it.
4. **On success, treat this as the end of the Courier's flow for this order** — route back to the queue (E2), which should now allow claiming again (E4) since this Courier no longer has an active delivery.
5. **Don't build any post-delivery edit/dispute UI.** The audit trail is intentionally shallow — Courier ID + timestamp only — matching the PRD's explicit risk-acceptance for cash reconciliation; anything more is out of scope for this course project.
6. **This action is what flips the Recipient's live state to `DELIVERED` (E10) and closes their map (also E10)** — don't build any Recipient-facing state changes as part of this story; those are driven by the `stage` change this endpoint produces, consumed separately by E8/E10.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E)
