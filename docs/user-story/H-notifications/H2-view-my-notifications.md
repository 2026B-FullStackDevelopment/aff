---
title: "[STORY][USER] View My Notifications"
labels: user-story
---

**Traceability:** PRD `H2` (`docs/PRD.md` §7) · API: `GET /notifications` (`docs/api_design.md` §14) · Depends on H1 (rows must exist to fetch)

## User Story
As a **logged-in User**,
I can **fetch my own notification history**
so that **I can see what happened even if I missed the live toast or reloaded the page**.

## Acceptance Criteria

- [ ] **Scenario:** Fetching my notifications
  - **Given** I am logged in and have received several notification-worthy events
  - **When** I call `GET /notifications`
  - **Then** I get a `200` with my notifications newest-first, paginated per the standard `{ items, page, limit, total }` envelope (`docs/api_design.md` §2.4)

- [ ] **Scenario:** Only my own notifications
  - **Given** other users have notifications of their own
  - **When** I call `GET /notifications`
  - **Then** I never see another user's rows — the query is scoped to `req.user.id` server-side, not a client-supplied id

- [ ] **Scenario:** Linking to the source Order or Listing
  - **Given** a notification has `orderId` and/or `listingId` set
  - **When** it's returned in the list
  - **Then** those fields are included as-is so the client can link to `GET /orders/:id` or the listing detail view; a notification with neither set simply returns them as `null`

- [ ] **Scenario:** No notifications yet
  - **Given** a newly registered User with no events yet
  - **When** they call `GET /notifications`
  - **Then** they get a `200` with an empty `items` array, not a `404`

- [ ] **Scenario:** Unauthenticated request is rejected
  - **Given** no or an invalid/revoked JWT
  - **When** `GET /notifications` is called
  - **Then** it is rejected with `401`, same as every other protected route

## Implementation Flow

1. **`GET /notifications`, auth: any authenticated role** — unlike most endpoints in this codebase, this one isn't role-scoped, since `NOTIFICATION.userId` can belong to a Recipient, Donor, or (once F3/G5 land) any role; the only scoping rule is "yours."
2. **Ownership is implicit**, exactly like `GET /orders/mine` (`docs/api_design.md` §7): always query by `req.user.id`, never accept a `userId` param from the client.
3. **Reuse the existing pagination convention** (`?page=&limit=`, defaults `page=1`/`limit=20`, max `100`) rather than inventing a cursor scheme — matches `GET /orders/mine`/`GET /listings`.
4. **Sort by `createdAt` descending** at the repository/query level, not client-side.
5. **Response is `NotificationDTO[]`** (`docs/api_design.md` §3) — a thin, direct mapping of the model's fields; no denormalized Order/Listing detail is joined in, keeping the endpoint cheap. The client fetches full Order/Listing detail separately if the user taps through.
6. **Blocked on H1** — there's nothing to return until notifications are actually being written.

## Related Epic
Notifications (Epic H — #142)
