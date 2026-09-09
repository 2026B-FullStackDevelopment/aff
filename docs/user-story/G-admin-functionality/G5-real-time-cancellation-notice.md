---
title: "[STORY][RECIPIENT] Real-Time Cancellation Notice"
labels: user-story
---

**Traceability:** PRD `G5` (SRS `7.3.3`) · Real-time event: `notification:admin_cancel` on `user:<recipientId>` (`docs/api_design.md` §12) · emitted from the G3 cascade

## User Story
As a **Recipient whose order's listing gets cancelled by an Admin (or by the Donor)**,
I can **see a live notification the moment it happens**
so that **I know my order is gone without discovering it later by refreshing my order history**.

## Acceptance Criteria

- [ ] **Scenario:** Live toast on admin cancellation
  - **Given** I am a connected Recipient with an order whose delivery is still `AWAITING_COURIER`
  - **When** an Admin cancels that order's listing (G3)
  - **Then** I receive `notification:admin_cancel` on `user:<recipientId>` with `{ orderId, listingName }`, and a toast tells me the order was cancelled

- [ ] **Scenario:** One event per affected Recipient
  - **Given** a listing has pending orders from several Recipients
  - **When** the cascade cancels them
  - **Then** each affected Recipient gets exactly one event for their own order — no Recipient sees another's

- [ ] **Scenario:** Same event for the Donor-initiated cancel path
  - **Given** the Donor (not the Admin) cancels the listing via C5
  - **When** the cascade runs
  - **Then** affected Recipients receive the same `notification:admin_cancel` event — it is keyed to the cascade, not to which actor triggered it

- [ ] **Scenario:** Transient, not persisted
  - **Given** I received the toast and reloaded
  - **When** the page returns
  - **Then** there is no read/unread record; my order history simply shows the order as `CANCELLED` from its own data

- [ ] **Scenario:** Disconnected Recipient
  - **Given** I am offline when the cancel happens
  - **When** the event is emitted
  - **Then** it is not delivered and not queued — I find the cancellation in my order history on next load

## Implementation Flow

1. **Emit from inside the G3/C5 cascade transaction**, once per Recipient whose order was auto-cancelled, to their `user:<recipientId>` room. Payload is `{ orderId, listingName }`.
2. **Create a transient `NOTIFICATION` (type=ADMIN_CANCEL)** for the live feed — no read-state, consistent with the "live feed only, no inbox" scope boundary (PRD §8).
3. **Client renders an in-app toast** and, if the affected order screen is open, flips it to the cancelled state from the event; otherwise the next data load reflects it.
4. **Do not build a catch-up / missed-events channel** — order history (`GET /orders/mine`) is the durable record; this event is purely a live nicety.
5. **Rides the shared Socket.IO layer** (with C9/F3/E-tracking). The room + JWT-handshake plumbing is shared; this story only adds the one emit call in the cascade.
6. **Blocked** on G3 (the cascade that fires it) and the shared Socket.IO layer (`docs/blockers.md`, G5 🔴).

## Related Epic
Admin Functionality (Epic G — #124)
