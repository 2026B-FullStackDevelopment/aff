---
title: "[STORY][COURIER] Pickup Location"
labels: user-story
---

**Traceability:** PRD `E5` (revised — was text-only; now includes a map) · API: `GET /deliveries/active`, `PATCH /deliveries/:id/claim` (`docs/api_design.md` §9)

## User Story
As a **Courier**,
I can **see the Donor's pickup address as text and a map marker right after claiming a delivery**
so that **I know where to go to pick up the order and can actually navigate there, not just read an address**.

## Acceptance Criteria

- [ ] **Scenario:** Pickup address and map shown after claim
  - **Given** I have just claimed a delivery (`stage=ASSIGNED`)
  - **When** the claim succeeds
  - **Then** `PATCH /deliveries/:id/claim`'s own response already includes `pickupAddressText` and `pickupAddressLocation` — no separate lookup call is needed to render either

- [ ] **Scenario:** The map marker is static, not live
  - **Given** I am viewing the pickup screen for my claimed delivery
  - **When** any time passes, including while I'm en route to the Donor
  - **Then** the marker never moves — `pickupAddressLocation` is a fixed pin on the Donor's registered location, not a live-updating position; there is no tracking concept for the pickup leg, since the Donor doesn't move

- [ ] **Scenario:** A Courier only ever sees pickup details for their own delivery
  - **Given** a delivery is `ASSIGNED` to a different Courier
  - **When** I (a different Courier) attempt to claim it or query my own active delivery
  - **Then** I never see that delivery's `pickupAddressText`/`pickupAddressLocation` — claim ownership is enforced atomically (E3), and `GET /deliveries/active` only ever returns *my own* active delivery, never another Courier's

- [ ] **Scenario:** Pickup address and map persist through the rest of the delivery lifecycle
  - **Given** my delivery progresses from `ASSIGNED` through `PICKED_UP` to `DELIVERED`
  - **When** I revisit the delivery view at any stage (via `GET /deliveries/active`, or the response from `pickup`/`deliver`)
  - **Then** `pickupAddressText`/`pickupAddressLocation` remain visible as a reference, even after I've already picked up the order — though once `PICKED_UP`, E6's live delivery-destination map takes over as the primary view

- [ ] **Scenario:** This story's data never comes from `GET /deliveries/:id`
  - **Given** a Courier is viewing their claimed delivery at any stage
  - **When** the client fetches or refreshes that delivery's data
  - **Then** it always does so via `GET /deliveries/active` or the `DeliveryDTO` returned by `claim`/`pickup`/`deliver` — `GET /deliveries/:id` is `RECIPIENT`/`ADMIN`-only and rejects a `COURIER` caller outright (see `docs/api_design.md` §9)

## Implementation Flow

1. **Read `pickupAddressText`/`pickupAddressLocation` straight off the `DeliveryDTO` returned by `claim` (or `GET /deliveries/active` on reload)** — both are already denormalized from the order's Donor server-side; don't make a separate call to fetch Donor details, and don't call `GET /deliveries/:id` for it — that endpoint no longer accepts `COURIER` callers at all (§9). A Courier never needs to look up a delivery by arbitrary ID: `/active` and the claim/pickup/deliver responses already cover every case a Courier's client needs.
2. **Render the map with Leaflet against `pickupAddressLocation`, reusing D8's marker component** (`donor.location` on the listing detail page uses the same shape) rather than building a second, parallel marker implementation. Show `pickupAddressText` alongside it, e.g. as a label or popup on the marker — text isn't replaced by the map, the two are shown together.
3. **This is a static marker, not a live map.** Don't wire a WebSocket subscription or a `watchPosition` loop here — the Donor's location doesn't change, so there's nothing to subscribe to. That distinguishes this map from E6/E9's live Courier-position tracking, which only exists for the delivery leg once `stage=PICKED_UP`.
4. **This view is the natural landing screen right after E3's successful claim, and also after a page reload/re-login while a claim is already in progress** — in the claim case, route here directly using the `id` from the claim response; in the reload case, this is exactly what E4's `GET /deliveries/active` call resolves to (its `id` is this same delivery). Either way, keep the "Picked Up" action (E6) visible from the same screen so the flow from claim → pickup confirmation is one continuous view, not a multi-page hop.
5. **Access control is stage-independent** — a Courier who claimed the delivery keeps seeing it through pickup and delivery, not just while `ASSIGNED`; don't gate visibility narrowly to one stage.
6. **Once `stage=PICKED_UP`, E6 replaces this static pickup map with its own live, delivery-destination-centered map on the same screen** — don't keep both maps rendered simultaneously; it's one map component that changes mode at the pickup transition, not two stacked maps.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E)
