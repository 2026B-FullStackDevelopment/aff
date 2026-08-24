---
title: "[STORY][RECIPIENT] Live Courier Position"
labels: user-story
---

**Traceability:** PRD `E9` (new) · API: Socket.IO `delivery:location` event (`docs/api_design.md` §12)

## User Story
As a **Recipient**,
while my order is out for delivery, I can **see the Courier's live position on a map**
so that **I know how close my delivery is and can prepare to receive it**.

## Acceptance Criteria

- [ ] **Scenario:** Map appears only during `PICKED_UP`
  - **Given** my order's delivery is `stage=PICKED_UP`
  - **When** I open the order's tracking view
  - **Then** a live map is shown, updating from `delivery:location` events

- [ ] **Scenario:** Map is absent before pickup and after delivery
  - **Given** my order's delivery is `AWAITING_COURIER`, `ASSIGNED`, or `DELIVERED`
  - **When** I view the order
  - **Then** no live tracking map is shown — `AWAITING_COURIER`/`ASSIGNED` show the status stepper only (E8), and `DELIVERED` shows the terminal state (E10)

- [ ] **Scenario:** I only see the Courier's position for my own current order
  - **Given** the Courier is delivering my order
  - **When** `delivery:location` pings are emitted
  - **Then** they're scoped to the `order:<orderId>` room, which I join only while viewing that specific order's tracking page — I never see location data for someone else's delivery, and I stop receiving pings once I navigate away

- [ ] **Scenario:** Map updates live as pings arrive
  - **Given** I am on the tracking view during `PICKED_UP`
  - **When** each `delivery:location` event arrives
  - **Then** the Courier's marker moves to the new `{ latitude, longitude }` without a page reload, within roughly the target ~10-second latency (PRD §6)

- [ ] **Scenario:** Map transitions to the delivered state exactly once
  - **Given** I am watching the live map
  - **When** `stage` transitions to `DELIVERED`
  - **Then** the live map is replaced by E10's static confirmation state — this story's live-tracking view has no further role once delivery completes

## Implementation Flow

1. **Join the `order:<orderId>` room only when the Recipient opens that specific order's tracking view, and leave it on navigating away** (per §12's connection model) — don't join proactively for every order in D5's history list, and don't leave the room open indefinitely once the Recipient leaves the page.
2. **Gate the map's presence strictly on `stage === 'PICKED_UP'`** — this is the one stage where `courierLastLocation` is meaningful; don't render a stale or last-known marker outside this window.
3. **Render with Leaflet**, consistent with the mapping stack used elsewhere (A2, D8) — no paid Map SDK per the SRS constraint.
4. **Update the marker's position directly from each `delivery:location` payload** (`{ orderId, latitude, longitude, updatedAt }`) rather than re-fetching `GET /deliveries/:id` on every ping — the whole point of the socket event is to avoid polling.
5. **Watch actual ping-to-render latency during testing against the target from PRD §6** (~10 seconds Courier-ping-to-visible) — this is a named success metric, not just a nice-to-have; if the map lags noticeably behind actual pings, that's a defect worth flagging even though the criteria above don't give an exact numeric SLA.
6. **On transition to `DELIVERED`, tear down the map/room subscription and hand off to E10** rather than leaving a frozen last-position marker on screen.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
