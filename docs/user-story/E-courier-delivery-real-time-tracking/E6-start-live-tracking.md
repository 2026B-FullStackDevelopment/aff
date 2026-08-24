---
title: "[STORY][COURIER] Start Live Tracking"
labels: user-story
---

**Traceability:** PRD `E6` (new) · API: `PATCH /deliveries/:id/pickup` + Socket.IO (`docs/api_design.md` §9, §12)

## User Story
As a **Courier**,
I can **tap "Picked Up" to confirm I've collected the order and start broadcasting my live location**
so that **the Recipient can watch their delivery approach in real time**.

## Acceptance Criteria

- [ ] **Scenario:** Tapping "Picked Up" advances the stage
  - **Given** my delivery is `stage=ASSIGNED`
  - **When** I tap "Picked Up"
  - **Then** `PATCH /deliveries/:id/pickup` sets `stage=PICKED_UP` and `pickedUpAt=now`

- [ ] **Scenario:** GPS broadcasting starts only after pickup is confirmed
  - **Given** my delivery has just transitioned to `PICKED_UP`
  - **When** the transition succeeds
  - **Then** my client opens a WebSocket channel and begins sending location pings — pings never start while the delivery is still `ASSIGNED`

- [ ] **Scenario:** Pickup rejected from the wrong stage
  - **Given** my delivery is not currently `ASSIGNED` (e.g. already `PICKED_UP` or `DELIVERED`)
  - **When** I attempt `PATCH /deliveries/:id/pickup`
  - **Then** the request is rejected with `409`

- [ ] **Scenario:** Map switches from the static pickup pin to live tracking
  - **Given** I've just confirmed pickup
  - **When** my delivery view updates
  - **Then** the map re-centers on the Recipient's `deliveryLocation` and switches into live-tracking mode, replacing E5's static Donor-pin map — same map component, different mode, not two separate maps

- [ ] **Scenario:** Location pings update `courierLastLocation`
  - **Given** I am broadcasting during `PICKED_UP`
  - **When** each ping is sent
  - **Then** `DELIVERY.courierLastLocation` is updated server-side, which is what E9 reads to show the Recipient my position

## Implementation Flow

1. **Sequence matters: confirm the `PATCH /deliveries/:id/pickup` call succeeds first, then open the WebSocket channel and start pings** — don't start broadcasting speculatively before the stage transition is confirmed, since a `409` (wrong stage) means pickup didn't actually happen.
2. **Request Browser Geolocation permission at this point in the flow, not earlier** — there's no reason to prompt for location access before the Courier has actually picked up an order. Handle permission denial explicitly (show an error state; without location, live tracking can't work for this delivery).
3. **This requires HTTPS in production** (PRD §9) — Browser Geolocation is unavailable on plain HTTP. Test this specific flow against the deployed Render origin, not just localhost, since it may behave differently.
4. **Pick a reasonable ping interval and stick to it consistently** (PRD's target is GPS-ping-to-visible latency under ~10 seconds, per §6 Success Metrics) — don't ping on every possible `geolocation.watchPosition` callback if that fires more often than needed; balance responsiveness against unnecessary socket traffic.
5. **Stop broadcasting the moment the delivery reaches `DELIVERED` (E7).** Tie the ping loop's lifecycle to the delivery's stage client-side — don't leave a stray `watchPosition` running after the job is done.
6. **This story's map is the Courier-side view.** E9 covers the equivalent Recipient-side "watch the Courier" map — don't conflate the two; they render for different roles from the same underlying `courierLastLocation` data.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E — #85)
