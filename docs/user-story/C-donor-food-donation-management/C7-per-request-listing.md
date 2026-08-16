---
title: "[STORY][DONOR] Per-Request Listing (Untracked, Self-Collection)"
labels: user-story
---

**Traceability:** PRD `C7` (SRS `4.2.1`, unchanged SRS intent) · API: `POST /listings` (`unit=PER_REQUEST`), `GET /listings/:id` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **post a "Per Request" listing**
so that **Recipients can come collect food in person without me having to manage individual tracked orders**.

## Acceptance Criteria

- [ ] **Scenario:** Creating a Per-Request listing shows the SRS warning
  - **Given** I am on the listing creation form
  - **When** I select `unit=PER_REQUEST`
  - **Then** I see the SRS-mandated warning that there is no online reservation, quantities are discretionary, and Recipients may arrive after stock is gone, before I can submit

- [ ] **Scenario:** Per-Request listings display the Donor's address instead of a Reserve action
  - **Given** a Recipient is viewing a listing with `unit=PER_REQUEST`
  - **When** the listing page renders
  - **Then** it prominently shows my address (from `GET /listings/:id`'s expanded `donor.addressText`/`location`) instead of a "Reserve" button, and the same SRS warning is shown on the Recipient-facing page too

- [ ] **Scenario:** No reservation is ever possible against a Per-Request listing
  - **Given** a listing exists with `unit=PER_REQUEST`
  - **When** any client attempts `POST /listings/:id/reserve` against its ID
  - **Then** the request is rejected with `422`, and no `ORDER` is ever created

- [ ] **Scenario:** No donor-initiated donation is ever possible against a Per-Request listing
  - **Given** a listing exists with `unit=PER_REQUEST`
  - **When** I attempt `POST /listings/:id/donations` against its ID
  - **Then** the request is rejected with `422`, and no `ORDER` is ever created

- [ ] **Scenario:** Per-Request listings never produce tracked records
  - **Given** a Per-Request listing has existed for some time and Recipients have self-collected from it in person
  - **When** I inspect the system's data for that listing
  - **Then** no `ORDER`, `PAYMENT`, or `DELIVERY` record references it — collection happened entirely outside the app

## Implementation Flow

1. **Choosing `PER_REQUEST` as the unit is handled by C1's creation form and warning.** This story's own scope is what happens afterward — the listing-detail page's rendering, and confirming the reservation/donation endpoints reject it.
2. **On the listing-detail page, branch on `unit === 'PER_REQUEST'`** to show the Donor's address + warning text instead of a Reserve button. Remove the Reserve button entirely in this branch — don't just disable it, since a disabled button implies reservation could become available later.
3. **Don't build a dedicated backend endpoint for this story.** The actual enforcement is the `422` rejection already specified in `POST /listings/:id/reserve` (D2) and `POST /listings/:id/donations` (C3) — this story's backend work is verifying those two reject `PER_REQUEST` listings, not adding new server logic.

## Related Epic
Donor Food Donation Management (Epic C — #66)
