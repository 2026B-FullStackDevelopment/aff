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
- [ ] A Donor can create a listing with name, description, unit, category, vegetarian flag, donation limit, and price, enforcing the free-or-at-least-15000-VND price rule and accepting only positive whole-number donation and ration limits
- [ ] A Donor can clone a past listing into a new pre-filled draft with quantity/status/dates reset
- [ ] A Donor can record one in-person donation per listing for a registered Recipient selected by email; an existing non-cancelled Order blocks another donation, a priced donation is cash-only and creates a `PAID`/`DELIVERED` Order, while a free donation creates a `FREE`/`DELIVERED` Order; neither creates a Delivery
- [ ] A Donor can search, filter, and sort their own listings by name/category/date range/revenue, split into Active and Past groupings
- [ ] A Donor can pause, resume, or cancel a listing; cancelling cascades to eligible pending Orders but never changes terminal in-person manual Orders
- [ ] A Donor can cap the quantity a single Recipient may reserve from a listing via an optional positive whole-number `rationLimitPerPerson`
- [ ] A Donor can create a `PER_REQUEST` listing that never produces an `ORDER`, `PAYMENT`, or `DELIVERY` record — Recipients see the Donor's address and self-collect
- [ ] A Donor can view every tracked order (Reservation + Donor-initiated) against one of their listings, including Recipient, quantity, fulfillment status, payment info, and feedback; manual Orders with no Delivery appear as "Completed in person"
- [ ] A Donor receives a real-time in-app alert the moment a listing's `quantityRemaining` hits zero

## Out of Scope
- Recipient-side browsing, reservation, and payment — Epic D (Recipient Food Ordering)
- Courier claim/delivery/tracking flow — Epic E (Courier Delivery & Real-Time Tracking)
- Admin-initiated listing cancellation — Epic G (Admin Functionality), story G3, which applies the identical cascade rule via `PATCH /admin/listings/:id/cancel`
- Persisting cash received or change — the manual-donation page calculates change locally as an in-person aid and sends neither value to the backend
- Stripe and Courier delivery for Donor-initiated manual donations — those Orders are completed at the Donor's premises

## Notes
- `4.1.4` (C3) and `4.2.1` (C7) are both **explicit deviations from the base SRS** — see `docs/PRD.md` §10 for the literal-text-vs-resolved-behavior table before implementing either.
- `4.1.2`'s originally standalone Active/Past donations dashboard story was retired and folded into C4 as a `?status=ACTIVE|PAST` filter on `GET /listings/mine` — see `docs/PRD.md` §10.
- C3 does not depend on `DeliveryService.createForOrder`; the endpoint creates a terminal Order without a Delivery. C9 still depends on the shared Socket.IO layer.
- Listing image upload reuses the shared `POST /media/upload-url` endpoint (`purpose: 'LISTING_IMAGE'`, `DONOR`-only) documented in `docs/api_design.md` §5A, same mechanism as Epic B's avatar upload.
