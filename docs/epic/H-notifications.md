---
title: "[EPIC] Notifications"
labels: epic
---

**Traceability:** PRD Epic H (`docs/PRD.md` §7) · Extends the existing `NOTIFICATION` model (`docs/database_design.md`) and the live Socket.IO events already used by C9, F3, G5, and the payments/delivery modules (`docs/api_design.md` §12) · API: `docs/api_design.md` §14

## Goal
Give every User a durable, fetchable record of the notification-worthy events already fired over Socket.IO, and centralize how those events are sent in the first place — one `notificationService.send(...)` call that both emits the live event and persists a `NOTIFICATION` row, plus a paginated `GET /notifications` endpoint to read the history back.

## User Stories
- [ ] #143 — Centralize Notification Sending
- [ ] #144 — View My Notifications

## Acceptance Criteria
- [ ] Every notification-worthy event (`SOLD_OUT` → Donor, `PAYMENT_SUCCESS` → Recipient, `DELIVERY_STATUS` → Recipient, and — once built — `PREMIUM_MATCH` and `ADMIN_CANCEL`) is sent through a single `notificationService.send({ userId, type, orderId?, listingId?, payload })` call that both emits the matching Socket.IO event and writes a `NOTIFICATION` row (`docs/database_design.md`)
- [ ] No business module (`listings`, `payments`, `delivery`, `subscriptions`, `admin`) calls `emitToUser(...)` directly for one of these five types, or writes to the `NOTIFICATION` collection itself — the notification service is the only place either happens
- [ ] `GET /notifications` returns the authenticated user's own notifications only, newest first, paginated per the existing `?page=&limit=` convention (`docs/api_design.md` §2.4)
- [ ] Each returned notification includes `orderId`/`listingId` when the model has them, so the client can link to the relevant Order or Listing detail view
- [ ] No user can fetch another user's notifications — enforced by scoping the query to `req.user.id`, never a client-supplied id
- [ ] The persistence half of a send can never block or fail the caller — if the `NOTIFICATION` write fails, the live event still fires and the caller's own action still succeeds

## Out of Scope
- **Read/unread state or a mark-as-read action** — this epic only adds durable storage and a read endpoint; `docs/PRD.md` §8 still excludes read-state tracking
- **A catch-up/replay channel over Socket.IO** — an offline user still simply misses the live event, per C9/F3/G5's existing scope; `GET /notifications` is the durable record, not a delivery guarantee
- **Building `notification:premium_match` (F3) or `notification:admin_cancel` (G5) themselves** — both remain blocked on their own prerequisites (`docs/blockers.md`); H1 just gives them a `notificationService.send(...)` call to use once they're built, for whichever lands first
- **New trigger points beyond what already exists** — H1 wraps the existing `SOLD_OUT`/`PAYMENT_SUCCESS`/`DELIVERY_STATUS` sites; no new business events are introduced
- **Centralizing `delivery:location`** — this stays a direct `emitToUser(...)` call; GPS pings are too frequent to belong in a persisted inbox
- **A dedicated `docs/openapi/notifications_openapi.json`** — add it when H2 is actually implemented, per `AGENTS.md`'s "update the OpenAPI spec when adding a backend endpoint" rule; several existing modules (`subscriptions`, `payments`) similarly don't have one yet

## Notes
- The `NOTIFICATION` collection has been fully specified in `docs/database_design.md` for a while — including the `orderId`/`listingId` FKs — but it was never actually persisted, and there was no centralized way to send one either: every module called `emitToUser(...)` directly. No `backend/src/modules/notifications` exists in the codebase today; this epic is what builds it.
- **This reverses a deliberate prior scope decision.** `docs/PRD.md` §8 previously excluded persisted notifications entirely ("live, in-session feed only"), and `docs/api_design.md` §13 listed `GET /notifications` as an explicit non-endpoint. Both, plus the "transient"/"no persisted" language in `docs/user-story/F-premium-subscription/F3-real-time-match-alerts.md` and `docs/user-story/G-admin-functionality/G5-real-time-cancellation-notice.md`, have been updated alongside this epic. Read/unread state remains the one piece that's still out of scope.
- H1 is a genuine centralization, not just persistence bolted on: it moves the emit call itself (not just the new database write) behind one `notification.interface.ts` function, so `listings`, `payments`, and `delivery` stop calling `emitToUser(...)` directly for these five types. This is a slightly larger change than a first pass might assume — it touches every existing call site, not just adds a new one alongside them.
- H2 has no dependency on F3/G5 landing first — it just queries whatever `NOTIFICATION` rows already exist, regardless of type. Its only real dependency is H1 existing so there's something to read.
