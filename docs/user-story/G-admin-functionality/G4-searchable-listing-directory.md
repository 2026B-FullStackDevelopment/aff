---
title: "[STORY][ADMIN] Searchable Listing Directory"
labels: user-story
---

**Traceability:** PRD `G4` (SRS `7.3.1`, `7.3.2`) · API: `GET /admin/listings?search=` (`docs/api_design.md` §11)

## User Story
As an **Admin**,
I can **search all listings by Donor name/ID or listing ID and see each one in full detail, regardless of status**
so that **I can investigate a report or complaint about any listing on the platform**.

## Acceptance Criteria

- [ ] **Scenario:** Searching the directory
  - **Given** I am logged in as Admin
  - **When** I call `GET /admin/listings?search=<term>`
  - **Then** I get a paginated list of listings whose Donor name, Donor ID, or listing ID matches the term, each with full `ListingDTO` detail

- [ ] **Scenario:** All statuses are visible
  - **Given** listings exist in `ACTIVE`, `PAUSED`, `CANCELLED`, and `SOLD_OUT`
  - **When** I search or browse the admin directory
  - **Then** listings of every status are returned — unlike the public `GET /listings`, there is no implicit active-only filter

- [ ] **Scenario:** Empty search returns everything, paginated
  - **Given** I call `GET /admin/listings` with no `search`
  - **When** the response comes back
  - **Then** it is the full listing set, paginated (`page`/`limit`/`total`)

- [ ] **Scenario:** Non-Admin is rejected
  - **Given** I am not an Admin
  - **When** I call `GET /admin/listings`
  - **Then** the request is rejected

## Implementation Flow

1. **Reuse the Donor-side listing query, drop the status filter** — the key distinction from `GET /listings` is that Admin sees every status. Match `search` against Donor `companyName`/`username`, Donor `id`, and listing `id`.
2. **Return the full `ListingDTO`** (including the denormalized `donor` subset) so the Admin can see Donor, price, quantity, rationing, and timestamps without a second call.
3. **Paginate** per `docs/api_design.md` §2.4; don't return the whole table unbounded.
4. **This is the table G3's cancel action lives in** — build them together: a searchable admin listings view with a per-row "Cancel listing" control.
5. **Read-only otherwise** — no editing of Donor listing content from the Admin side; the only write is G3's cancel.
6. **Blocked** on the C1 listings schema rebuild (`docs/blockers.md`, G4 🔴).

## Related Epic
Admin Functionality (Epic G — #124)
