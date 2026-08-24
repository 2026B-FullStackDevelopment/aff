---
title: "[STORY][COURIER] One Active Delivery at a Time"
labels: user-story
---

**Traceability:** PRD `E4` (new) · API: `GET /deliveries/active`, `PATCH /deliveries/:id/claim` (`docs/api_design.md` §9)

## User Story
As a **Courier**,
I can **be blocked from claiming a second order while one is already in progress**
so that **I always have exactly one clear job to focus on, never a stack of competing deliveries**.

## Acceptance Criteria

- [ ] **Scenario:** Claim button hidden/disabled while a delivery is active
  - **Given** I currently have a `DELIVERY` in `ASSIGNED` or `PICKED_UP`
  - **When** I view the queue (E2)
  - **Then** the "Claim" control is disabled or hidden on every row — I'm steered toward my current delivery instead

- [ ] **Scenario:** Claim endpoint enforces the rule even if the button is bypassed
  - **Given** I have an active delivery and somehow issue `PATCH /deliveries/:id/claim` anyway (e.g. a stale client)
  - **When** the request is processed
  - **Then** it is rejected with `409` — the server-side check is authoritative, not just a UI convenience

- [ ] **Scenario:** Claiming becomes available again after completing the active delivery
  - **Given** my active delivery reaches `stage=DELIVERED` (E7)
  - **When** I return to the queue
  - **Then** claim controls are enabled again — I have no active delivery blocking me

- [ ] **Scenario:** The one-active-delivery check and the claim's stage check are inseparable
  - **Given** the atomic claim operation (E3)
  - **When** it evaluates a claim attempt
  - **Then** both the target delivery's stage and the Courier's existing active-delivery status are checked in the same atomic operation — not as two separate round-trips that could race against each other

## Implementation Flow

1. **This story is mostly the UI-side complement to E3's server-side enforcement** — the actual guarantee (no second active delivery) is already implemented as part of E3's atomic claim; this story's job is making the constraint visible and pre-emptively blocking the action in the UI, not re-implementing the check.
2. **Derive "do I have an active delivery" from `GET /deliveries/active`** — call this once on load (and again after any claim/deliver action) rather than scanning the queue for `courierId=me`, since active deliveries by definition aren't in the queue. `200` means disable claim controls and surface the returned `DeliveryDTO`'s `id`; `404` means claiming is open.
3. **When a Courier with an active delivery lands on the queue screen, redirect them straight to their active delivery's view (using the `id` from `GET /deliveries/active`) instead of showing a queue with every row disabled** — that's the better default, and it's also how a Courier resumes their in-progress job after a page reload or re-login, not just how the queue screen behaves.
4. **Don't add a "swap" or "override" affordance.** The scope boundary is explicit: no way for a Courier to abandon or override an active delivery to claim a different one — the only path back to claiming is completing (E7) or the delivery reaching a terminal state.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
