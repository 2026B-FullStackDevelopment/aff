---
title: "[STORY][RECIPIENT] View Donor Location"
labels: user-story
---

**Traceability:** PRD `D8` (SRS `5.3.4`) · API: `GET /listings/:id` (`docs/api_design.md` §6)

## User Story
As a **Recipient**,
I can **see a Donor's location on a map from a listing's page**
so that **I understand where the food is coming from, and — for Per-Request listings — know exactly where to go to collect it**.

## Acceptance Criteria

- [ ] **Scenario:** Map shows Donor location on a Reservation/Donor-initiated-eligible listing
  - **Given** I am viewing a listing with `unit != PER_REQUEST`
  - **When** the listing detail page loads via `GET /listings/:id`
  - **Then** a map marker renders at `donor.location`, shown as informational context alongside the listing details

- [ ] **Scenario:** Map is the actual meetup point on a Per-Request listing
  - **Given** I am viewing a listing with `unit=PER_REQUEST`
  - **When** the listing detail page loads
  - **Then** the same map marker and `donor.addressText` are shown, but as the literal self-collection destination (consistent with C7's Per-Request page treatment), not just background context

- [ ] **Scenario:** Location data comes from the expanded Donor object
  - **Given** I request `GET /listings/:id`
  - **When** the response returns
  - **Then** it includes `donor` expanded to `{ id, companyName, addressText, location }` — no separate call to a Donor-profile endpoint is needed to render the map

- [ ] **Scenario:** Listing not found
  - **Given** a listing ID doesn't exist or was removed
  - **When** I call `GET /listings/:id`
  - **Then** the request returns `404`

## Implementation Flow

1. **Fetch `GET /listings/:id` once for the whole detail page** — the expanded `donor.location`/`donor.addressText` needed for the map ships in the same response as the rest of the listing's detail fields; don't make a second request for Donor info.
2. **Render the map with Leaflet against `donor.location` (`{ latitude, longitude }`)**, matching the mapping stack already used for Donor address capture at registration (A2) — no paid Map SDK, per the SRS constraint (PRD §9).
3. **Branch the surrounding UI on `unit === 'PER_REQUEST'`**, reusing C7's framing: show the address/warning-forward layout for Per-Request, and the map-as-context layout (alongside a Reserve action) otherwise. Don't build two separate map components — same marker, different surrounding chrome.
4. **This story is read-only rendering.** It doesn't call any reservation or donation endpoint itself — D2 (Reserve & Pay) and C7 (Per-Request enforcement) own those actions; this story just needs to link to them from the same page.

## Related Epic
Recipient Food Ordering (Epic D)
