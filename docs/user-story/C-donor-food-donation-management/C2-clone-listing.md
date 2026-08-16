---
title: "[STORY][DONOR] Clone Listing"
labels: user-story
---

**Traceability:** PRD `C2` (SRS `4.1.3`) · API: `POST /listings/:id/clone` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **create a new listing pre-filled from a previous one**
so that **I don't have to re-enter the same details for a repeat donation**.

## Acceptance Criteria

- [ ] **Scenario:** Successful clone
  - **Given** I own a past listing
  - **When** I select "Duplicate" on that listing
  - **Then** the creation form opens pre-populated with its static fields (name, description, unit, category, vegetarian flag, price, ration limit, image), with quantity/status/dates left for me to review before I submit

- [ ] **Scenario:** Cloning creates an independent listing
  - **Given** I confirm the pre-populated form
  - **When** `POST /listings/:id/clone` is called
  - **Then** a new `LISTING` document is created with `status=ACTIVE`, `quantityRemaining` reset to `donationLimit`, a fresh `createdAt`, and no reference back to the original listing

- [ ] **Scenario:** Cannot clone another Donor's listing
  - **Given** a listing exists that does not belong to me
  - **When** I attempt `POST /listings/:id/clone` on that listing's ID
  - **Then** the request is rejected with `403` and no new listing is created

- [ ] **Scenario:** Cloning a nonexistent listing
  - **Given** the listing ID I attempt to clone does not exist
  - **When** I attempt `POST /listings/:id/clone`
  - **Then** the request is rejected with `404`

## Implementation Flow

1. **"Duplicate" only pre-fills a form — it doesn't clone yet.** Fetch the source listing (`GET /listings/:id`) to populate the creation UI for the Donor to review/edit; the actual clone only happens once they confirm.
2. **`POST /listings/:id/clone` takes no request body.** All field-copying happens server-side from the source listing — don't try to pass the edited form values into the clone call itself; if the Donor changed anything, that's a separate follow-up edit after cloning, not part of this endpoint.
3. **Treat the response as a brand-new, independent listing.** Use its own `id`, `status=ACTIVE`, `quantityRemaining`, and fresh `createdAt` — never carry over the source listing's runtime state (its current `quantityRemaining`, orders, or status) into the new one.
4. **Handle `403` and `404` as distinct, specific errors** ("not your listing" vs. "listing no longer exists") rather than one generic failure message — the Donor needs to know which case they hit.

## Related Epic
Donor Food Donation Management (Epic C — #66)
