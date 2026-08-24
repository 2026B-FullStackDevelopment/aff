---
title: "[STORY][COURIER] Atomic Claim"
labels: user-story
---

**Traceability:** PRD `E3` (new) · API: `PATCH /deliveries/:id/claim` (`docs/api_design.md` §9)

## User Story
As a **Courier**,
I can **claim an unclaimed order from the queue**
so that **it becomes my job to deliver, with no risk that another Courier ends up assigned to the same order**.

## Acceptance Criteria

- [ ] **Scenario:** Successful claim
  - **Given** a delivery is `stage=AWAITING_COURIER` and I have no other active delivery
  - **When** I call `PATCH /deliveries/:id/claim`
  - **Then** `DELIVERY.stage=ASSIGNED` and `courierId` is set to me, atomically

- [ ] **Scenario:** Double-claim race is rejected, not double-assigned
  - **Given** two Couriers call `PATCH /deliveries/:id/claim` on the same delivery at effectively the same time
  - **When** both requests are processed
  - **Then** exactly one succeeds with `200`; the other receives `409` — the atomic conditional update (`stage: AWAITING_COURIER → ASSIGNED` only if still `AWAITING_COURIER`) guarantees this under concurrent access

- [ ] **Scenario:** Claim blocked by an existing active delivery
  - **Given** I already have a `DELIVERY` in `ASSIGNED` or `PICKED_UP`
  - **When** I attempt to claim another
  - **Then** the request is rejected with `409` — this check happens in the same atomic operation as the stage check (see E4)

- [ ] **Scenario:** Claim rejected for a stale queue view
  - **Given** I loaded the queue, then someone else claimed the top entry before I clicked claim
  - **When** I click claim on that now-stale row
  - **Then** I get `409`, and my UI reflects that this order is no longer available rather than silently retrying

- [ ] **Scenario:** A successful claim also enforces D4's cancellation cutoff
  - **Given** a Recipient attempts to cancel their order at the same instant I claim its delivery
  - **When** both operations race
  - **Then** the same atomic conditional update ensures exactly one of "claimed" or "cancelled" wins — never both

## Implementation Flow

1. **This story's core work is backend: the atomic conditional update itself.** Implement the claim as a single conditional database operation (e.g. `findOneAndUpdate` with a `stage: 'AWAITING_COURIER'` filter) — never a read-then-write pair, which would reintroduce the exact race this story exists to close.
2. **Explicitly unit-test the concurrent-claim race**, per PRD §9's flagged risk — fire two simultaneous claim attempts against the same delivery in a test and assert exactly one succeeds. This is called out as a specific correctness requirement, not just a nice-to-have test.
3. **The "one active delivery" check (E4) must run inside the same atomic operation as the stage check**, not as a separate query beforehand — two sequential checks reopen a race window between them.
4. **On the frontend, treat `409` as an expected, common outcome, not an error state to alarm the user over** — show "already claimed" or "you already have an active delivery" inline, and refresh the queue (E2) so the stale row disappears.
5. **After a successful claim, route the Courier straight into the claimed-order view (E5)** — don't leave them back on the queue screen after a successful claim.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
