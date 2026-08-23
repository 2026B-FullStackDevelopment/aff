---
title: "[STORY][ADMIN] Admin Read-Only Delivery Oversight"
labels: user-story
---

**Traceability:** PRD `E11` (extends SRS `7.1.1`/`7.3.1`; same story as G6) · API: `GET /admin/couriers`, `GET /admin/deliveries` (`docs/api_design.md` §11)

## User Story
As an **Admin**,
I can **see Couriers listed alongside Recipients/Donors, plus a read-only view of every delivery**
so that **I have full visibility into the Courier pipeline without any ability to interfere with in-flight assignments**.

## Acceptance Criteria

- [ ] **Scenario:** Courier accounts appear in account management
  - **Given** Courier accounts exist (created via E1)
  - **When** I view `GET /admin/users?role=COURIER` or `GET /admin/couriers`
  - **Then** they appear alongside Recipient/Donor accounts with the same account-management fields (ID, name, email, role, status)

- [ ] **Scenario:** Deliveries table shows status and timestamps
  - **Given** deliveries exist across every stage
  - **When** I call `GET /admin/deliveries`
  - **Then** each row shows the assigned Courier (if any), `stage`, and relevant timestamps (`pickedUpAt`, `deliveredAt`), plus the associated order's recipient reference

- [ ] **Scenario:** Deliveries are filterable by stage
  - **Given** I want to see only deliveries at a specific point in the pipeline
  - **When** I call `GET /admin/deliveries?stage=PICKED_UP` (or any valid stage)
  - **Then** only matching deliveries are returned

- [ ] **Scenario:** No assignment controls exist anywhere in this view
  - **Given** I am viewing the deliveries table
  - **When** I look for a way to manually assign, reassign, or force-claim a delivery to a Courier
  - **Then** no such control exists — this view is read-only by design, per the explicit "no Admin manual dispatch" scope boundary

- [ ] **Scenario:** Only Admin can access these endpoints
  - **Given** I am logged in as a non-Admin role
  - **When** I attempt `GET /admin/couriers` or `GET /admin/deliveries`
  - **Then** the request is rejected

## Implementation Flow

1. **Build this as two views sharing the existing Admin account-management shell (G1)**: Courier accounts slot into the same accounts table (filter by `role=COURIER`, or use the `GET /admin/couriers` convenience alias — either reaches the same data), and deliveries get their own read-only table.
2. **Resist adding any action buttons to the deliveries table beyond viewing.** This is the one place in the app where the temptation to add "just a manual override for edge cases" is highest — the PRD is explicit that Admin manual delivery assignment is out of scope; don't build it even as a stretch addition.
3. **Support the `stage=` filter as a simple dropdown/tab control** over the deliveries table — pair it with pagination (`page`/`limit`/`total`) rather than fetching every delivery at once.
4. **This story and G6 (in Epic G's admin epic) are the same implementation** — build it once here; Epic G's file cross-references this story rather than duplicating the work. Don't implement it twice under two different tickets.
5. **Deactivating a Courier account reuses G2's existing `PATCH /admin/users/:id/status` flow** — no Courier-specific deactivation logic needed; the same status toggle and `REVOKED_TOKEN` cascade apply uniformly across roles.

## Related Epic
Courier Delivery & Real-Time Tracking (Epic E) — also referenced by Epic G (Admin Functionality), story G6
