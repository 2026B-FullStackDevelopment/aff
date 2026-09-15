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

- [x] **Scenario:** A new listing matches my preference
  - **Given** I am a connected Premium Recipient with a saved preference "vegetarian BAKED_GOODS under $5 in District 1"
  - **When** a Donor publishes a new `ACTIVE` listing that satisfies every set constraint of that preference
  - **Then** I receive `notification:premium_match` on `user:<recipientId>` with `{ listingId, name, preferenceTitle, message }`, and a toast displaying `message` links me to that listing

- [x] **Scenario:** Null constraints are treated as "no filter"
  - **Given** my preference sets only `categories: [MEAT]` and leaves price, vegetarian, and city null
  - **When** any new `ACTIVE` MEAT listing is published, at any price, in any city
  - **Then** it matches and I am alerted

- [x] **Scenario:** Non-matching listing produces no alert
  - **Given** my only preference is for `DRINK` listings
  - **When** a new `VEGETABLE` listing is published
  - **Then** I receive no event

- [x] **Scenario:** Standard-tier Recipients are never matched
  - **Given** a Recipient on the `STANDARD` tier (including one with stale preference rows from a lapsed subscription)
  - **When** any listing is published
  - **Then** no `notification:premium_match` is emitted to them

- [x] **Scenario:** The toast is transient, but the notification persists
  - **Given** I received a match toast and then reloaded the page
  - **When** the page comes back
  - **Then** the toast itself is gone (it only ever existed in the live session), but the underlying `NOTIFICATION` row is fetchable via `GET /notifications` (Epic H) — there is still no read/unread record of it

- [x] **Scenario:** Offline Premium Recipient misses the event
  - **Given** I am Premium but not currently connected over Socket.IO
  - **When** a matching listing is published
  - **Then** the event is simply not delivered — there is no queue or catch-up on reconnect (matches the "live feed only" scope)

## Implementation Flow

1. **Hook the matcher into the listing-creation Service path**, after the listing is persisted as `ACTIVE` (`POST /listings`, C1) — not in the controller, so Donor-initiated and any other creation path all trigger it.
2. **Iterate Premium Recipients' preferences server-side**: for each `NotificationPreference`, a listing matches when every *non-null* field agrees — `category ∈ categories`, `isVegetarian == vegetarian`, `price` within `[priceMin, priceMax]`, `city == city`. A null field is skipped.
3. **Re-check tier at match time**, don't trust a cached flag — a Recipient whose subscription lapsed still has preference rows but must not match (reuse F1's derived-tier logic).
4. **Call `notificationService.send({ userId: recipientId, type: 'PREMIUM_MATCH', listingId, payload: { listingId, name, preferenceTitle } })` once per matched Recipient** (`docs/epic/H-notifications.md`, H1) — this single call both emits `notification:premium_match` to `user:<recipientId>` and persists the `NOTIFICATION` row; F3 never calls `emitToUser(...)` or writes to the `NOTIFICATION` collection itself. No read-state tracking either way. `preferenceTitle` exists so the server-built `message` (below) can name the matched preference — the client never reads `preferenceTitle` directly. The matched preference's own `_id` is not sent to the client; nothing currently needs it.
5. **The server builds `message` naming both the listing and the matched preference** (`notification.service.ts#buildMessage`, e.g. `A new listing "Fresh Bread" matches your "Vegetarian Bakery" preference.`) — the client displays `message` as-is rather than composing its own copy from the raw payload fields.
6. **Client shows a toast (its text is `message`) linking to `GET /listings/:id`** (D-side listing detail). Nothing is stored client-side beyond the current session's toast stack.
7. **Keep the matching loop cheap** — for a course-project scale, an in-process scan of Premium preferences on each listing create is fine; note it as a known scaling cut, don't build an index.
8. **Blocked** on F2 (preferences must exist), the C1 listing-creation rebuild (the trigger point), and the shared Socket.IO layer (`docs/blockers.md`, F3 🔴).

## Related Epic
Premium Subscription (Epic F — #119)
