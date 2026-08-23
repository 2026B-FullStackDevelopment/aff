---
title: "[STORY][RECIPIENT] Delivered State"
labels: user-story
---

**Traceability:** PRD `E10` (new) · client-rendered from `DELIVERY.stage=DELIVERED`; no dedicated endpoint (`docs/api_design.md` §9, §12)

## User Story
As a **Recipient**,
once my order is delivered, I can **see a permanent "Your order has arrived" state replacing the live map**
so that **I have clear, final confirmation that the delivery is complete, with no lingering live-tracking UI**.

## Acceptance Criteria

- [ ] **Scenario:** Live map is replaced on delivery
  - **Given** I am viewing the live tracking map during `PICKED_UP` (E9)
  - **When** the `delivery:delivered` event fires (`stage → DELIVERED`)
  - **Then** the map is replaced by a static "Your order has arrived" confirmation, with no further location updates

- [ ] **Scenario:** Delivered state is what renders on a fresh page load too
  - **Given** my order's delivery already reached `DELIVERED` before I open the page
  - **When** the order detail page loads
  - **Then** it renders directly into the static confirmation state — it doesn't briefly show a live map first

- [ ] **Scenario:** No further live updates occur after delivery
  - **Given** I am viewing the delivered confirmation
  - **When** any time passes
  - **Then** no `delivery:location` events are processed for this order — the client should have left the `order:<orderId>` room, and the UI never re-enters a live-tracking state for a `DELIVERED` order

- [ ] **Scenario:** Feedback action is reachable from this state
  - **Given** my order is `DELIVERED`
  - **When** I view this confirmation
  - **Then** D7's feedback form is available from the same view — the delivered state is where the Recipient naturally transitions from "watching" to "reacting"

## Implementation Flow

1. **This story has no backend surface of its own** — it's purely a client rendering decision keyed off `DELIVERY.stage=DELIVERED` (or the `delivery:delivered` event payload `{ orderId, deliveredAt }`). Don't build a new endpoint for it.
2. **Treat this as the terminal branch of the same stage-driven view that renders E8's stepper and E9's live map** — one component tree branching on `stage`, not three independently-built screens that have to be kept in sync by hand.
3. **On receiving `delivery:delivered`, explicitly tear down the E9 map/socket-room subscription** before swapping in the static confirmation — don't just overlay the confirmation on top of a still-live map component.
4. **Show `deliveredAt` in the confirmation** (from the event payload or the order's data) so the Recipient has a concrete timestamp, not just a generic "delivered" label.
5. **Link directly to D7's feedback form from this screen** — this is the moment the PRD expects a Recipient to naturally leave feedback, so don't make them navigate elsewhere to find it.
6. **There is intentionally no Recipient-side confirmation step here.** `DELIVERED` is sole-source-of-truth from the Courier's action (E7) — don't add a "confirm receipt" button or any control that implies the Recipient's state contributes to whether the order counts as delivered.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E)
