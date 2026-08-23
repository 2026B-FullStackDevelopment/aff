---
title: "[EPIC] Courier Delivery & Real-Time Tracking"
labels: epic
---

**Traceability:** PRD Epic E (`docs/PRD.md` §7) · sole Additional Feature, Ultimo tier throughout · API: `docs/api_design.md` §9, §11, §12

## Goal
Give Couriers a claim-based, one-job-at-a-time delivery queue covering both tracked intake paths (Reservation, Donor-initiated), with live GPS tracking visible to the Recipient while out for delivery and cash-collection confirmation at the door — so every Path 1/2 order reaches the Recipient through one shared, auditable pipeline, with read-only Admin oversight and no manual dispatch.

## User Stories
- [ ] E1 — Admin Creates Courier Accounts
- [ ] E2 — Shared Oldest-First Queue
- [ ] E3 — Atomic Claim
- [ ] E4 — One Active Delivery at a Time
- [ ] E5 — Pickup Location
- [ ] E6 — Start Live Tracking
- [ ] E7 — Complete Delivery (with Cash Confirmation)
- [ ] E8 — Live Order Status for Recipient
- [ ] E9 — Live Courier Position
- [ ] E10 — Delivered State
- [ ] E11 — Admin Read-Only Delivery Oversight
- [ ] E12 — Single Delivery Entry Point

## Acceptance Criteria
- [ ] An Admin can create a Courier account (username, email, temp password, full name) — Couriers never self-register
- [ ] A Courier sees a shared queue of unclaimed orders (`DELIVERY.stage=AWAITING_COURIER`) sorted oldest-first by `ORDER.createdAt`
- [ ] A Courier can claim an order via an atomic conditional update (`AWAITING_COURIER` → `ASSIGNED`); a second Courier racing the same claim gets a `409`, never a double-assignment
- [ ] A Courier already holding an `ASSIGNED` or `PICKED_UP` delivery cannot claim a second one
- [ ] After claiming, a Courier sees the Donor's pickup address as text plus a static map marker on the Donor's location — not live-updating, since the Donor doesn't move
- [ ] Tapping "Picked Up" sets `stage=PICKED_UP` and starts live GPS broadcasting over WebSocket, scoped to that order's Recipient only
- [ ] Tapping "Delivered" sets `stage=DELIVERED` as the sole terminal state — no Recipient confirmation step — and, for cash orders, requires an explicit "cash received, exact amount, no change" confirmation before it flips `ORDER.paymentStatus` to `PAID`
- [ ] A Recipient sees their order's status stepper update live over WebSocket, without refreshing
- [ ] A Recipient sees the Courier's live position on a map only while `stage=PICKED_UP`, scoped to their own order's room
- [ ] Once delivered, a Recipient's map is replaced by a static "Your order has arrived" state with no further live updates
- [ ] An Admin can see Couriers listed alongside Recipients/Donors, plus a read-only table of all deliveries — no assignment controls
- [ ] Both the Reservation and Donor-initiated flows create a `DELIVERY` record through the same `DeliveryService.createForOrder(orderId)` entry point, with no divergent logic between the two paths

## Out of Scope
- Delivery-failure/redo path — every claimed delivery is expected to complete
- Live tracking on the pickup leg — E5's map is a static marker on the Donor's fixed location, not live-updating; live GPS tracking (E6/E9) stays delivery-leg only, once `PICKED_UP`
- Courier self-registration — Admin-created only (E1)
- Cancellation once a delivery is `ASSIGNED` or later — the cutoff is enforced by the same atomic check as the claim (see Epic D, story D4)
- Admin manual delivery assignment — claim-based queue only, no dispatch controls (E11)
- Recipient-side browsing, reservation, and payment that produces the order in the first place — Epic D (Recipient Food Ordering)
- Donor-side listing management that produces Donor-initiated orders — Epic C (Donor Food Donation Management)

## Notes
- E12 (`DeliveryService.createForOrder`) is the root prerequisite for this entire epic and for C3/D2. The `delivery` module is scaffolded in `backend/src/modules/delivery` (model, routes, controller, service, DTO) but every handler is currently a `501 notImplemented` stub, including `createForOrder` itself — real business logic still needs to be built before E1–E11 (or C3/D2) can proceed. `docs/blockers.md`'s "no delivery module exists" note is stale as of this scaffold; update it to reflect "scaffolded but unimplemented" instead.
- `GET /deliveries/active` (Courier's own in-progress delivery, `docs/api_design.md` §9) is the entry point E4 and E5 both rely on to resolve "which delivery am I on" after a page reload or re-login — implement it early alongside E12, since E2–E7's flows all assume it exists.
- E3's atomic claim is explicitly flagged in PRD §9 as a specific concurrency risk requiring unit tests — verify no double-claim under concurrent access before considering this story done.
- E6/E9 depend on the Socket.IO real-time layer (shared with C9/F3/G5) and on the Browser Geolocation API, which requires HTTPS in production — full testing needs the Render deployment, not just localhost (PRD §9).
- E7's cash-confirmation audit trail is intentionally shallow — Courier ID + timestamp only, no deeper reconciliation (PRD §9 risk mitigation); don't build anything more elaborate.
- E11/G6 are the same story — E11 is authoritative here; Epic G's admin epic file cross-references it for `7`-group traceability rather than duplicating it.
- Per `docs/blockers.md`: every story in this epic is 🔴 Blocked as of the last assessment.
- No GitHub issues have been filed for this epic yet — the checklist above uses story IDs (`E1`–`E12`) rather than issue numbers; file issues from `docs/user-story/E-courier-delivery-real-time-tracking/` following the same pattern as Epics A–C (#47–#76) when ready to track them on the board.
