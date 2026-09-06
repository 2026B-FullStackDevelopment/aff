---
title: "[EPIC] Admin Functionality"
labels: epic
---

**Traceability:** PRD Epic G (`docs/PRD.md` §7) · SRS `7`. Ultimo, extended per Epic E · API: `docs/api_design.md` §11, §12

## Goal
Give the Admin the operator tools to keep the marketplace healthy: view and filter every account (Recipient, Donor, Courier), deactivate or reactivate any of them with immediate session revocation, cancel any active listing with the same order-cascade rule Donors get, search the full listing directory, and have visibility into the Courier delivery queue and history — all read-only where the PRD says so (no manual dispatch, no assignment controls).

## User Stories
- [ ] #125 — View All Accounts
- [ ] #126 — Deactivate / Reactivate Account
- [ ] #127 — Cancel Any Active Listing
- [ ] #128 — Searchable Listing Directory
- [ ] #129 — Real-Time Cancellation Notice
- [ ] #130 — Read-Only Courier Oversight *(same story as E11 / #104 — pointer for `7`-group traceability, not duplicated)*

## Acceptance Criteria
- [ ] An Admin can list all accounts via `GET /admin/users`, filterable by `role` (`RECIPIENT`/`DONOR`/`COURIER`/`ADMIN`), `status`, and `search`, each row showing ID, name, email, role, and status
- [ ] Courier accounts (created via E1) appear in that same listing; `GET /admin/couriers` is a convenience alias reaching the same data
- [ ] An Admin can set any account's status to `ACTIVE` or `DEACTIVATED` via `PATCH /admin/users/:id/status`
- [ ] Deactivating an account revokes all of that user's live tokens immediately — current-session `jti`s are inserted into `REVOKED_TOKEN` with `reason=ADMIN_DEACTIVATE` — so the user is logged out on their next request
- [ ] An Admin can cancel any active listing via `PATCH /admin/listings/:id/cancel`; the listing goes `CANCELLED` and only orders still in `AWAITING_COURIER` (or with no `DELIVERY` record yet) are auto-cancelled, with `cancelledByUserId` set to the Admin's `userId`
- [ ] Orders already `ASSIGNED` or later are never touched by the cancel cascade — same rule as the Donor's own listing-cancel (C5)
- [ ] The cancel response reports `cancelledOrderCount`
- [ ] An Admin can search the full listing directory via `GET /admin/listings?search=` (matching Donor name/ID or listing ID) and sees listings in **every** status, unlike the public `GET /listings`
- [ ] Each Recipient whose order is auto-cancelled by the G3 cascade receives a live `notification:admin_cancel` toast (`{ orderId, listingName }`) on `user:<recipientId>` — no page refresh required
- [ ] An Admin has read-only visibility into Couriers and all deliveries (`GET /admin/couriers`, `GET /admin/deliveries`, filterable by `stage`) with **no** assignment, reassignment, or force-claim controls anywhere (see E11)
- [ ] Every `/admin/*` endpoint rejects non-Admin roles

## Out of Scope
- **Admin manual delivery dispatch / assignment / reassignment** — the Courier queue is claim-based only; G6/E11 is strictly read-only (PRD §8)
- **Hard-deleting accounts or listings** — deactivate and cancel are the only lifecycle actions; nothing is permanently removed
- **Editing another user's profile data** — Admin can change `status` only, not contact fields, passwords, or emails
- **A persisted admin notification/audit log** — G5 is a transient live toast to the affected Recipient; there is no admin-side event history beyond what the `ORDER`/`LISTING` records themselves carry (`cancelledByUserId`, timestamps)
- **Courier account creation** — that is **E1** (`POST /admin/couriers`); Epic G only *views and oversees* Couriers. E1 is listed under Epic E for Additional-Feature traceability; there is no separate G story for it
- **Bulk actions** — one account / one listing per action

## Notes
- Per `docs/blockers.md`: **G1 and G2 are 🟡 Partial** — G1 depends on A1/A2 and on **E1** existing before Courier accounts can appear; G2 depends on G1 plus A4's `REVOKED_TOKEN` revocation path. **G3, G4, G5, G6 are 🔴 Blocked** — G3/G4 on the C1 listings/orders schema rebuild (G3 also on the not-yet-built Delivery module, since the cascade reads `DELIVERY.stage`), G5 on G3 plus the shared Socket.IO layer, G6 on E1/E11.
- **G6 and E11 are the same implementation.** `docs/user-story/E-courier-delivery-real-time-tracking/E11-admin-read-only-delivery-oversight.md` is authoritative. `docs/user-story/G-admin-functionality/G6-read-only-courier-oversight.md` is a thin pointer file for `7`-group traceability — build it once, under E11's ticket, not twice.
- **Courier creation lives in Epic E (E1), not here.** It is `POST /admin/couriers` and is Admin-only, so functionally it is an admin capability, but the PRD files it under the Courier Delivery Additional Feature. If the team wants a `7`-group traceability stub for it, add a cross-reference line to E1 rather than a new G story.
- G2's deactivation cascade reuses the exact `REVOKED_TOKEN` mechanism from A4 (logout) and `PATCH /admin/users/:id/status` — the only difference is `reason=ADMIN_DEACTIVATE`. The same toggle covers Couriers with no role-specific logic.
- G3 and the Donor's `PATCH /listings/:id/status` (C5) must share one cascade implementation — the auto-cancel predicate (`AWAITING_COURIER` or no Delivery record) and the `cancelledByUserId` stamping are identical; only the actor differs.
- G5 rides the shared Socket.IO layer (with C9/F3/E6/E8/E9). It is emitted from inside the G3 cascade transaction, one event per affected Recipient.
- G4's admin listing search deliberately has **no status filter** — Admin sees `ACTIVE`, `PAUSED`, `CANCELLED`, and `SOLD_OUT` alike; that is the distinction from the public `GET /listings`.
