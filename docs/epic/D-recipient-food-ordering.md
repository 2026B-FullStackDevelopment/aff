---
title: "[EPIC] Recipient Food Ordering"
labels: epic
---

**Traceability:** PRD Epic D (`docs/PRD.md` §7) · SRS `5.1`, `5.2`, `5.3.4`. Ultimo throughout, with §10 payment/cancellation deviations · API: `docs/api_design.md` §6, §7

## Goal
Let Recipients browse, search, and reserve active listings; pay by Stripe or cash-on-delivery; cancel before a Courier claims the order; and track and give feedback on their order history — so a Recipient can go from discovering surplus food to receiving it entirely inside the app.

## User Stories
- [ ] #86 — Browse Active Listings
- [ ] #87 — Reserve & Pay
- [ ] #88 — Stripe Card Registration at First Card Checkout
- [ ] #89 — Cancel Order Before Courier Claim
- [ ] #90 — Order/Delivery History
- [ ] #91 — Search/Filter/Sort Listings
- [ ] #92 — Feedback on Delivered Order
- [ ] #93 — View Donor Location

## Acceptance Criteria
- [ ] A Recipient can browse active listings showing name, category, vegetarian flag, quantity, unit, price, Donor municipality, and created date
- [ ] A Recipient can reserve a listing (subject to eligibility checks: active, not paused/cancelled, not Per-Request, sufficient quantity, one reservation per listing) and choose Stripe checkout or cash-on-delivery before the order enters the Courier queue
- [ ] The first time a Recipient pays by card, a Stripe Customer + payment method is registered against their account and reused on every later card checkout, including Premium subscription checkout
- [ ] A Recipient can cancel their own order at any point while its delivery is still `AWAITING_COURIER`, and is blocked once a Courier has claimed it
- [ ] Cancelling a Stripe-paid order automatically triggers a refund — `REFUND_PENDING` immediately, `REFUNDED` (pushed live) once Stripe confirms — with cancellation never blocked on Stripe's reachability
- [ ] A Recipient can view their full order history — donation, Donor, quantity, price paid, payment method, delivery status, date
- [ ] A Recipient can search (case-insensitive partial match) and filter listings by municipality/category/price range, with sortable price
- [ ] A Recipient can leave feedback on an order once it reaches `orderStatus=DELIVERED`, visible to the Donor
- [ ] A Recipient can see a Donor's location on a map from a listing page — informational context for Reservation/Donor-initiated listings, the literal meetup point for Per-Request listings

## Out of Scope
- Listing creation and Donor-side lifecycle management (pause/resume/cancel, ration limits, sold-out alerts) — Epic C (Donor Food Donation Management)
- Courier claim, pickup, live tracking, and delivery completion — Epic E (Courier Delivery & Real-Time Tracking)
- Premium subscription checkout and notification preferences — Epic F (Premium Subscription). *(Location-aware ranking was cut — SRS `5.3.3`, PRD §10 — so `GET /listings` offers only its base `sort=price`.)*
- Admin-initiated order/listing cancellation — Epic G (Admin Functionality), story G3
- Partial refunds — D4's refund is always for the full order amount; there's no partial-cancellation concept
- Manual Admin refund handling — only the rare case a Stripe refund *attempt itself* errors (`refundStatus=FAILED`) is still an unaddressed edge case; the normal path is fully automatic

## Notes
- D2/D3 depend on real Stripe sandbox/test-mode keys (currently placeholder-only in `.env.example` per `docs/blockers.md`) and on `DeliveryService.createForOrder` (Epic E, story E12) existing before an order can enter the Courier queue.
- D4's atomic cancel check shares its concurrency guarantee with E3's atomic claim — both read/write `DELIVERY.stage` under the same conditional-update guard, so a claim racing a cancellation can never leave both operations believing they won.
- D4 has two *separate* real-time considerations, worth not conflating: the "Cancel Order" button's visibility deliberately does **not** need a live Socket.IO update (a page-load snapshot plus the `409` fallback on a stale click is sufficient — see the story's Implementation Flow). The refund confirmation (`REFUND_PENDING` → `REFUNDED`) **does** need one — `payment:refunded` (`docs/api_design.md` §12), since that transition is driven by an external Stripe webhook arriving independently of anything the Recipient does on the page.
- D6 (browse) and D8 (Donor location) both depend on the Epic C `LISTING`/`DONOR` schema rebuild (`docs/blockers.md`) — nothing to browse or locate until that lands.
- Per `docs/blockers.md`: every story in this epic is 🔴 Blocked as of the last assessment, on the `listing.model.ts`/`order.model.ts` schema rebuild and the not-yet-built `delivery` module.
