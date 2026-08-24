---
title: "[STORY][RECIPIENT] Search/Filter/Sort Listings"
labels: user-story
---

**Traceability:** PRD `D6` (SRS `5.2.1`, `5.2.2`) · API: `GET /listings` (`docs/api_design.md` §6)

## User Story
As a **Recipient**,
I can **search listings and filter by municipality, category, and price, with sortable price**
so that **I can narrow down active listings to the ones actually relevant to me, instead of scrolling everything**.

## Acceptance Criteria

- [ ] **Scenario:** Case-insensitive partial-match search
  - **Given** active listings exist with varying names
  - **When** I search with `search=<partial term>`, regardless of case
  - **Then** only listings whose `name` contains that term (case-insensitively) are returned

- [ ] **Scenario:** Filter by municipality and category
  - **Given** active listings exist across multiple cities and categories
  - **When** I filter with `city=` and/or `category=`
  - **Then** only listings matching all supplied filters are returned

- [ ] **Scenario:** Filter by price range
  - **Given** active listings exist with varying prices
  - **When** I filter with `priceMin=` and/or `priceMax=`
  - **Then** only listings within that range are returned

- [ ] **Scenario:** Sort by price
  - **Given** active listings exist with varying prices
  - **When** I request `sort=price&order=asc` or `sort=price&order=desc`
  - **Then** the returned listings are ordered accordingly

- [ ] **Scenario:** Filters compose together
  - **Given** I apply a search term, a category filter, and a price sort simultaneously
  - **When** I call `GET /listings` with all three query params
  - **Then** the response reflects all three applied together, not just the last one set

- [ ] **Scenario:** Filters only ever apply within active listings
  - **Given** I apply any combination of filters
  - **When** the request runs
  - **Then** results remain scoped to `status=ACTIVE` — filtering never surfaces `PAUSED`/`CANCELLED`/`SOLD_OUT` listings

## Implementation Flow

1. **Treat `search`, `city`, `category`, `priceMin`/`priceMax`, and `sort`/`order` as independently composable query params on the same `GET /listings` call D1 already uses** — this story extends D1's browse view with controls, it isn't a separate page or endpoint.
2. **Debounce the search input** before firing the request, matching C4's pattern — don't issue a request on every keystroke.
3. **Build the query string incrementally as filters change**, not via a full form submit — each filter change (city dropdown, category chips, price range, sort toggle) should update the results without a page reload.
4. **`status=ACTIVE` stays implicit and non-overridable from this UI** — don't expose a status filter to the Recipient; that's D1's fixed default, not something this story changes.
5. **Reset to page 1 whenever a filter changes**, but keep the current filter state when only the page changes — don't lose applied filters on pagination.

## Related Epic
Recipient Food Ordering (Epic D — #84)
