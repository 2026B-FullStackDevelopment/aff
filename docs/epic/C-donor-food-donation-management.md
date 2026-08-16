---
title: "[EPIC] Donor Food Donation Management"
labels: epic
---

**Traceability:** PRD Epic C (`docs/PRD.md` §7) · SRS `4`. Ultimo throughout, with §10 deviations on `4.1.4`/`4.2.1` · API: `docs/api_design.md` §6

## Goal
Let Donors create, manage, and track food listings across all three intake models — self-service Reservation, Donor-initiated donations to a registered Recipient, and untracked Per-Request self-collection — so Donors can redistribute surplus food with minimal admin overhead.

## User Stories
- [ ] #68 — Create Listing
- [ ] #69 — Clone Listing
- [ ] #70 — Donor-Initiated Donation for a Registered Recipient
- [ ] #71 — Search/Filter/Sort Own Listings, with Active/Past Grouping
- [ ] #72 — Pause / Resume / Cancel Listing
- [ ] #73 — Ration Limit Per Person
- [ ] #74 — Per-Request Listing (Untracked, Self-Collection)
- [ ] #75 — View Orders Against a Listing
- [ ] #76 — Sold-Out Alert

## Acceptance Criteria
- [ ] A Donor can create a listing with name, description, unit, category, vegetarian flag, donation limit, and price, enforcing the free-or->1000-VND price rule
- [ ] A Donor can clone a past listing into a new pre-filled draft with quantity/status/dates reset
- [ ] A Donor can manually create a donation for a registered Recipient (found by email, never free text — email, not username, since `username` has no uniqueness constraint); priced donations require the Recipient to choose Stripe or cash-on-delivery before entering the Courier queue
- [ ] A Donor can search, filter, and sort their own listings by name/category/date range/revenue, split into Active and Past groupings
- [ ] A Donor can pause, resume, or cancel a listing; cancelling cascades to auto-cancel every associated order still `AWAITING_COURIER`
- [ ] A Donor can cap the quantity a single Recipient may reserve from a listing via `rationLimitPerPerson`
- [ ] A Donor can create a `PER_REQUEST` listing that never produces an `ORDER`, `PAYMENT`, or `DELIVERY` record — Recipients see the Donor's address and self-collect
- [ ] A Donor can view every tracked order (Reservation + Donor-initiated) against one of their listings, including Recipient, quantity, delivery status, payment info, and feedback
- [ ] A Donor receives a real-time in-app alert the moment a listing's `quantityRemaining` hits zero

## Out of Scope
- Recipient-side browsing, reservation, and payment — Epic D (Recipient Food Ordering)
- Courier claim/delivery/tracking flow — Epic E (Courier Delivery & Real-Time Tracking)
- Admin-initiated listing cancellation — Epic G (Admin Functionality), story G3, which applies the identical cascade rule via `PATCH /admin/listings/:id/cancel`
- Cash + change display at physical Donor-Recipient handoff, and free-text Recipient names — explicitly deviated from the base SRS `4.1.4` text; see §10 of `docs/PRD.md`

## Notes
- `4.1.4` (C3) and `4.2.1` (C7) are both **explicit deviations from the base SRS** — see `docs/PRD.md` §10 for the literal-text-vs-resolved-behavior table before implementing either.
- `4.1.2`'s originally standalone Active/Past donations dashboard story was retired and folded into C4 as a `?status=ACTIVE|PAST` filter on `GET /listings/mine` — see `docs/PRD.md` §10.
- Per `docs/blockers.md`: every story in this epic is 🔴 Blocked as of the last assessment — `listing.model.ts` still uses the pre-PRD-v2 schema (`title`, `pickupLocation`, missing `category`/`unit`/`price` rule) and needs a rebuild per `docs/database_design.md` before any story here can be implemented. C3 additionally depends on `DeliveryService.createForOrder` (Epic E), and C9 depends on the not-yet-built Socket.IO layer.
- Listing image upload reuses the shared `POST /media/upload-url` endpoint (`purpose: 'LISTING_IMAGE'`, `DONOR`-only) documented in `docs/api_design.md` §5A, same mechanism as Epic B's avatar upload.
