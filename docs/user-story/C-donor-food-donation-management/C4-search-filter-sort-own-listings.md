---
title: "[STORY][DONOR] Search/Filter/Sort Own Listings, with Active/Past Grouping"
labels: user-story
---

**Traceability:** PRD `C4` (SRS `4.1.2`, `4.2.2` — absorbs the standalone dashboard story, revised per PRD §10) · API: `GET /listings/mine` (`docs/api_design.md` §6)

## User Story
As a **Donor**,
I can **filter my listings into Active and Past groupings, and search/filter/sort within them by name, category, date range, and revenue**
so that **I can track my impact and manage all my listings from one view**.

## Acceptance Criteria

- [ ] **Scenario:** Active/Past toggle groups listings correctly
  - **Given** I own listings in a mix of `ACTIVE`, `PAUSED`, `CANCELLED`, and `SOLD_OUT` statuses
  - **When** I call `GET /listings/mine?status=ACTIVE`
  - **Then** only listings with `status` in `ACTIVE` or `PAUSED` are returned
  - **and** calling with `status=PAST` returns only listings with `status` in `CANCELLED` or `SOLD_OUT`

- [ ] **Scenario:** Search by name
  - **Given** I own multiple listings
  - **When** I search with `search=<partial name>`
  - **Then** only my listings whose `name` matches the search term are returned

- [ ] **Scenario:** Filter by category and date range
  - **Given** I own listings across multiple categories and creation dates
  - **When** I filter with `category=` and/or `from=`/`to=`
  - **Then** only listings matching all supplied filters are returned

- [ ] **Scenario:** Sort by date or revenue
  - **Given** I own multiple listings with different `createdAt` values and computed revenue
  - **When** I request `sort=createdAt&order=desc` or `sort=revenue&order=desc`
  - **Then** the returned listings are ordered accordingly

- [ ] **Scenario:** Each listing shows donated quantity and revenue
  - **Given** I have listings with associated orders
  - **When** I view `GET /listings/mine`
  - **Then** each returned listing includes `donatedQuantity` and `revenue`, computed from its associated `ORDER`s

- [ ] **Scenario:** Only my own listings are ever returned
  - **Given** other Donors have their own listings
  - **When** I call `GET /listings/mine` with any combination of filters
  - **Then** the results are always implicitly scoped to `donorId = <my user ID>`, regardless of what filters I pass

## Implementation Flow

1. **Treat `status`, `search`, `category`, `from`/`to`, and `sort`/`order` as independently composable query params.** Build the query string incrementally as the Donor changes any one filter — don't require a full form submission to apply filters.
2. **Never add a `donorId` param.** Scoping to the logged-in Donor's own listings is implicit server-side; the endpoint always ignores/rejects an attempt to query anyone else's.
3. **Debounce the search input** before firing `GET /listings/mine` — don't issue a request on every keystroke.
4. **Drive pagination from the response's `page`/`limit`/`total`**, not by fetching every page up front and paginating client-side.
5. **Render `donatedQuantity`/`revenue` directly from each listing in the response.** These are precomputed server-side from associated orders — don't re-derive them from a separate orders query.

## Related Epic
Donor Food Donation Management (Epic C — #66)
