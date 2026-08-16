---
title: "[STORY][DONOR] Sold-Out Alert"
labels: user-story
---

**Traceability:** PRD `C9` (SRS `4.3.1`) · API: Socket.IO event (`docs/api_design.md` §12), triggered from the Listings Service layer

## User Story
As a **Donor**,
I can **get a real-time alert the moment one of my listings sells out**
so that **I know immediately without having to check my listings manually**.

## Acceptance Criteria

- [ ] **Scenario:** Listing hits zero quantity and I'm alerted live
  - **Given** I am logged in and connected via Socket.IO, with an active listing whose `quantityRemaining` is about to reach zero
  - **When** the next reservation or donation brings `LISTING.quantityRemaining` to zero
  - **Then** the Service layer emits a sold-out event, `LISTING.status` is set to `SOLD_OUT`, and I see an in-app toast plus an audible alert without refreshing the page

- [ ] **Scenario:** Sold-out listing moves out of Active grouping
  - **Given** one of my listings has just sold out
  - **When** I view my listings (C4)
  - **Then** it now appears under the Past grouping (`status=SOLD_OUT`) instead of Active

- [ ] **Scenario:** No alert fires for listings I don't own
  - **Given** another Donor's listing sells out
  - **When** the sold-out event is emitted
  - **Then** I do not receive a toast or audible alert for it — only the owning Donor is notified

- [ ] **Scenario:** No alert fires for Per-Request listings
  - **Given** I own a `PER_REQUEST` listing
  - **When** Recipients self-collect from it over time
  - **Then** no sold-out alert is ever triggered for it, since Per-Request listings don't track `quantityRemaining` against tracked orders

## Implementation Flow

1. **Subscribe to the Socket.IO channel only after login, scoped to the current Donor's own listings.** Don't subscribe to a global event stream and filter client-side — that would leak other Donors' sell-out events over the wire.
2. **Trigger the toast and the audible alert from the same event handler**, not two independently-wired listeners that could drift out of sync.
3. **Update the affected listing's local status (`SOLD_OUT`) directly from the socket event** rather than waiting for the Donor to refresh or re-fetch C4's list.
4. **This story only covers the alert.** `LISTING.status=SOLD_OUT` is already being persisted server-side as part of the reservation/donation flow (C1/C4's data model) — don't re-implement that persistence here.

## Related Epic
Donor Food Donation Management (Epic C — #66)
