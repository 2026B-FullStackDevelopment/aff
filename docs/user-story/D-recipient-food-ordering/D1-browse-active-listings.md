---
title: "[STORY][RECIPIENT] Browse Active Listings"
labels: user-story
---

**Traceability:** PRD `D1` (SRS `5.1.1`) · API: `GET /listings` (`docs/api_design.md` §6)

## User Story
As a **Recipient**,
I can **browse active listings with their key details**
so that **I can quickly scan what surplus food is currently available before deciding what to reserve**.

## Acceptance Criteria

- [ ] **Scenario:** Browsing shows only active listings
  - **Given** listings exist across `ACTIVE`, `PAUSED`, `CANCELLED`, and `SOLD_OUT` statuses
  - **When** I call `GET /listings` (default `status=ACTIVE`)
  - **Then** only `ACTIVE` listings are returned — `PAUSED`, `CANCELLED`, and `SOLD_OUT` listings never appear in the browse view

- [ ] **Scenario:** Each listing card shows the key browse fields
  - **Given** I am viewing the browse grid/list
  - **When** a listing renders
  - **Then** it shows name, category, vegetarian flag, quantity remaining, unit, price, the Donor's municipality, and created date

- [ ] **Scenario:** Browsing works without logging in
  - **Given** I am not authenticated
  - **When** I load the browse page
  - **Then** `GET /listings` succeeds and returns the same public listing data — no login is required to browse

- [ ] **Scenario:** Paginated results
  - **Given** more active listings exist than fit on one page
  - **When** I scroll or page forward
  - **Then** the client requests the next page using the response's `page`/`limit`/`total`, not by fetching everything up front

## Implementation Flow

1. **Call `GET /listings` with no filters beyond the implicit `status=ACTIVE` default** — this story is the unfiltered browse view; search/filter/sort inputs belong to D6, not here. Don't wire filter UI into this story's request.
2. **Render straight from `ListingDTO`** — `donor.city` for municipality, `quantityRemaining`/`unit` together, `price` (0 renders as "Free," not "$0" or blank). No client-side computation needed.
3. **This endpoint is public — don't gate the browse page behind an auth check.** Only reservation (D2) requires a logged-in Recipient; browsing must work for an anonymous visitor.
4. **Drive pagination from the response's `page`/`limit`/`total`**, matching C4's pattern — request the next page on demand, don't paginate a locally-fetched full set.
5. **Each card should link through to `GET /listings/:id` (D8)** for the detail/map view — this story only covers the list surface, not the detail page.

## Related Epic
Recipient Food Ordering (Epic D)
