---
title: "[STORY][RECIPIENT] Real-Time Match Alerts"
labels: user-story
---

**Traceability:** PRD `F3` (SRS `5.3.2`) · Real-time event: `notification:premium_match` on `user:<recipientId>` (`docs/api_design.md` §12) · trigger: listing creation (§6, `POST /listings`)

## User Story
As a **Premium Recipient**,
I can **get a live in-session toast the moment a newly published listing matches one of my saved preferences**
so that **I can act on scarce food before it runs out, without polling or refreshing**.

## Acceptance Criteria

- [ ] **Scenario:** A new listing matches my preference
  - **Given** I am a connected Premium Recipient with a saved preference "vegetarian BAKED_GOODS under $5 in District 1"
  - **When** a Donor publishes a new `ACTIVE` listing that satisfies every set constraint of that preference
  - **Then** I receive `notification:premium_match` on `user:<recipientId>` with `{ listingId, name, matchedPreferenceId }`, and a toast links me to that listing

- [ ] **Scenario:** Null constraints are treated as "no filter"
  - **Given** my preference sets only `categories: [MEAT]` and leaves price, vegetarian, and city null
  - **When** any new `ACTIVE` MEAT listing is published, at any price, in any city
  - **Then** it matches and I am alerted

- [ ] **Scenario:** Non-matching listing produces no alert
  - **Given** my only preference is for `DRINK` listings
  - **When** a new `VEGETABLE` listing is published
  - **Then** I receive no event

- [ ] **Scenario:** Standard-tier Recipients are never matched
  - **Given** a Recipient on the `STANDARD` tier (including one with stale preference rows from a lapsed subscription)
  - **When** any listing is published
  - **Then** no `notification:premium_match` is emitted to them

- [ ] **Scenario:** The alert is transient, not an inbox item
  - **Given** I received a match toast and then reloaded the page
  - **When** the page comes back
  - **Then** the toast is gone and there is no unread/read record of it anywhere — it exists only in the live session

- [ ] **Scenario:** Offline Premium Recipient misses the event
  - **Given** I am Premium but not currently connected over Socket.IO
  - **When** a matching listing is published
  - **Then** the event is simply not delivered — there is no queue or catch-up on reconnect (matches the "live feed only" scope)

## Implementation Flow

1. **Hook the matcher into the listing-creation Service path**, after the listing is persisted as `ACTIVE` (`POST /listings`, C1) — not in the controller, so Donor-initiated and any other creation path all trigger it.
2. **Iterate Premium Recipients' preferences server-side**: for each `NotificationPreference`, a listing matches when every *non-null* field agrees — `category ∈ categories`, `isVegetarian == vegetarian`, `price` within `[priceMin, priceMax]`, `city == city`. A null field is skipped.
3. **Re-check tier at match time**, don't trust a cached flag — a Recipient whose subscription lapsed still has preference rows but must not match (reuse F1's derived-tier logic).
4. **Emit one event per matched Recipient** to their `user:<recipientId>` room with `{ listingId, name, matchedPreferenceId }`; create a transient `NOTIFICATION` (type=PREMIUM_MATCH) for the feed with **no** read-state tracking.
5. **Client shows a toast linking to `GET /listings/:id`** (D-side listing detail). Nothing is stored client-side beyond the current session's toast stack.
6. **Keep the matching loop cheap** — for a course-project scale, an in-process scan of Premium preferences on each listing create is fine; note it as a known scaling cut, don't build an index.
7. **Blocked** on F2 (preferences must exist), the C1 listing-creation rebuild (the trigger point), and the shared Socket.IO layer (`docs/blockers.md`, F3 🔴).

## Related Epic
Premium Subscription (Epic F — #119)
