---
title: "[STORY][RECIPIENT] Live Order Status for Recipient"
labels: user-story
---

**Traceability:** PRD `E8` (new) · API: Socket.IO `order:status_changed` event (`docs/api_design.md` §12)

## User Story
As a **Recipient**,
I can **watch my order's status update live**
so that **I always know where my delivery stands without manually refreshing the page**.

## Acceptance Criteria

- [ ] **Scenario:** Status stepper reflects the current stage on load
  - **Given** I open my order's detail page
  - **When** it loads via `GET /deliveries/:id` (or the order's embedded delivery data)
  - **Then** the stepper (preparing → picked up/out for delivery → delivered) shows the correct current step, driven entirely by `DELIVERY.stage` — never by `ORDER.orderStatus`, which stays coarse throughout (see Implementation Flow)

- [ ] **Scenario:** Stepper updates live without a refresh
  - **Given** I am viewing my order's detail page and connected via Socket.IO
  - **When** the delivery transitions stage (e.g. a Courier claims it, picks it up, or delivers it)
  - **Then** an `order:status_changed` event updates the stepper immediately, with no page reload

- [ ] **Scenario:** I only receive updates for my own orders
  - **Given** another Recipient's order changes stage
  - **When** the corresponding event is emitted
  - **Then** I don't receive it — `order:status_changed` is scoped to `user:<recipientId>`, my personal room only

- [ ] **Scenario:** Stepper doesn't regress
  - **Given** my order has already reached `DELIVERED`
  - **When** I revisit the page later
  - **Then** the stepper still shows `DELIVERED` as the final, static state (see E10) — it never appears to go backward

## Implementation Flow

1. **Connect to Socket.IO with the JWT in the handshake once, at session start**, and rely on the server-side `user:<userId>` room join (§12) rather than manually subscribing per order — this event is already scoped correctly server-side.
2. **`DELIVERY.stage` is the sole driver of the stepper — never `ORDER.orderStatus`.** `orderStatus` is intentionally coarse (`PENDING_PAYMENT`/`PREPARING`/`DELIVERED`/`CANCELLED` only, per `docs/api_design.md` §3/§9) and is never updated on claim or pickup, so it can't distinguish "preparing" from "out for delivery." Use this fixed mapping instead: no `DELIVERY` yet, or `stage=AWAITING_COURIER`/`ASSIGNED` → **"preparing"**; `stage=PICKED_UP` → **"picked up / out for delivery"** (one active step — there's no separate system event between being picked up and being en route, so don't split it into two distinguishable stepper states); `stage=DELIVERED` → **"delivered"** (hands off to E10).
3. **On receiving `order:status_changed`, update only the matching order's local state** (match on `orderId` in the payload) — don't force a full refetch of the order list/history on every event.
4. **This story covers the status text/stepper only.** The live map showing Courier position is E9's scope, and the terminal "arrived" screen replacing the map is E10's — keep those as separate concerns even though they're driven by the same underlying stage transitions.
5. **Handle the case where the Recipient opens the order detail page after missing an earlier event** (e.g. they weren't connected when the Courier claimed it) — always hydrate the stepper from the initial `GET` response first, then layer live updates on top; never rely on socket events alone to establish initial state.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E)
